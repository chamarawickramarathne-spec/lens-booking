<?php
/**
 * Daily cron script: Downgrade expired photographer plans to Free
 *
 * Logic:
 * - Find photographers whose package expire date is today or in the past
 * - Only target non-Free users (Pro/Premium/Unlimited)
 * - Set access level to Free and clear expire_date
 *
 * Run: php api/cron/downgrade_expired_access.php
 */

// Use CLI-safe error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Root resolve
$root = dirname(__DIR__);

require_once $root . '/config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();

    if (!$conn) {
        throw new Exception('Database connection not established.');
    }

    // Helper: does a column exist?
    $columnExists = function (PDO $conn, string $table, string $column): bool {
        $sql = "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c";
        $stmt = $conn->prepare($sql);
        $stmt->execute([':t' => $table, ':c' => $column]);
        return (int)$stmt->fetch(PDO::FETCH_ASSOC)['c'] > 0;
    };

    // Detect target table and columns
    $table = 'photographers';

    $hasExpire = $columnExists($conn, $table, 'expire_date');
    $hasExpiry = $columnExists($conn, $table, 'expiry_date');
    $expireCol = $hasExpire ? 'expire_date' : ($hasExpiry ? 'expiry_date' : null);

    if ($expireCol === null) {
        throw new Exception("Neither 'expire_date' nor 'expiry_date' column exists on {$table}.");
    }

    $hasUALId = $columnExists($conn, $table, 'user_access_level_id');
    $hasUAL = $columnExists($conn, $table, 'user_access_level');

    if (!$hasUALId && !$hasUAL) {
        throw new Exception("No access level column ('user_access_level_id' or 'user_access_level') found on {$table}.");
    }

    // Determine how access level is stored (id vs text)
    $accessCol = $hasUALId ? 'user_access_level_id' : 'user_access_level';

    $dataTypeSql = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c";
    $typeStmt = $conn->prepare($dataTypeSql);
    $typeStmt->execute([':t' => $table, ':c' => $accessCol]);
    $dataType = strtolower((string)$typeStmt->fetchColumn());

    $isNumericAccess = in_array($dataType, ['int', 'bigint', 'smallint', 'mediumint', 'tinyint']);

    // Resolve the Free level reference
    $freeId = null;
    $freeName = 'Free';

    // Try to read access_levels table if it exists
    $hasAccessLevels = false;
    try {
        $hasAccessLevels = (function (PDO $conn): bool {
            $sql = "SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'access_levels'";
            $stmt = $conn->query($sql);
            return (int)$stmt->fetch(PDO::FETCH_ASSOC)['c'] > 0;
        })($conn);
    } catch (Throwable $e) {
        $hasAccessLevels = false;
    }

    if ($hasAccessLevels) {
        $freeStmt = $conn->prepare("SELECT id, level_name FROM access_levels WHERE level_name IN ('Free', 'free') ORDER BY level_name = 'Free' DESC LIMIT 1");
        $freeStmt->execute();
        $freeRow = $freeStmt->fetch(PDO::FETCH_ASSOC);
        if ($freeRow) {
            $freeId = (int)$freeRow['id'];
            $freeName = $freeRow['level_name'];
        }
    }

    // Build filter for non-free users
    $nonFreeFilter = '';
    $params = [];

    if ($isNumericAccess) {
        // If we know the Free id, target everyone with access != Free
        if ($freeId !== null) {
            $nonFreeFilter = "({$accessCol} IS NULL OR {$accessCol} <> :freeId)";
            $params[':freeId'] = $freeId;
        } else {
            // Fallback: if we have access_levels, fetch all non-free ids
            if ($hasAccessLevels) {
                $ids = $conn->query("SELECT id FROM access_levels WHERE level_name IN ('Pro','Premium','Unlimited')")->fetchAll(PDO::FETCH_COLUMN);
                if (!empty($ids)) {
                    $in = implode(',', array_map('intval', $ids));
                    $nonFreeFilter = "{$accessCol} IN ({$in})";
                } else {
                    // Last resort: update anyone with an access level set
                    $nonFreeFilter = "{$accessCol} IS NOT NULL";
                }
            } else {
                $nonFreeFilter = "{$accessCol} IS NOT NULL";
            }
        }
    } else {
        // Textual access level e.g. 'free', 'pro', ...
        $nonFreeFilter = "LOWER({$accessCol}) IN ('pro','premium','unlimited')";
    }

    // Safety: ensure we have a non-empty filter
    if (trim($nonFreeFilter) === '') {
        throw new Exception('Could not determine non-free user filter; aborting to avoid mass update.');
    }

    // Prepare UPDATE
    $setAccessSql = $isNumericAccess
        ? ($freeId !== null ? "{$accessCol} = :toFree" : null)
        : "{$accessCol} = :toFreeText";

    if ($setAccessSql === null) {
        // Numeric column but Free id is unknown; try to resolve by name lookup inline
        if ($hasAccessLevels) {
            $setAccessSql = "{$accessCol} = (SELECT id FROM access_levels WHERE level_name = 'Free' LIMIT 1)";
        } else {
            throw new Exception('Free access level id could not be resolved.');
        }
    }

    $sql = "UPDATE {$table}
            SET {$setAccessSql}, {$expireCol} = NULL
            WHERE {$expireCol} IS NOT NULL
              AND {$expireCol} <= CURDATE()
              AND {$nonFreeFilter}";

    $stmt = $conn->prepare($sql);

    if ($isNumericAccess) {
        if ($freeId !== null && strpos($setAccessSql, ':toFree') !== false) {
            $params[':toFree'] = $freeId;
        }
    } else {
        $params[':toFreeText'] = 'free'; // use lowercase to match common schema
    }

    $conn->beginTransaction();
    $stmt->execute($params);
    $affected = $stmt->rowCount();
    $conn->commit();

    // Basic output for logs
    $when = date('Y-m-d H:i:s');
    echo "[{$when}] Downgraded {$affected} photographer(s) to Free where {$expireCol} <= today.\n";

    exit(0);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof PDO && $conn->inTransaction()) {
        $conn->rollBack();
    }
    fwrite(STDERR, '[ERROR] ' . $e->getMessage() . "\n");
    exit(1);
}
