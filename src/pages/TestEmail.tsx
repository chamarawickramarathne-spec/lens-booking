import DashboardLayout from "@/components/layout/DashboardLayout";
import TestEmailForm from "@/components/TestEmailForm";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

const TestEmail = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Test Email</h2>
          <p className="text-muted-foreground">
            Send test emails to verify your email configuration
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Mode:</strong> Emails are logged to the server console instead of being sent.
            Check your PHP error log to see the email details. To enable actual email sending, 
            set <code>$isDevelopment = false</code> in <code>api/send-test-email.php</code>.
          </AlertDescription>
        </Alert>

        <div className="max-w-2xl">
          <TestEmailForm />
        </div>

        <Card className="max-w-2xl">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Troubleshooting Tips:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>In development mode, check your PHP error log for logged email details</li>
              <li>Ensure your mail server is configured correctly in production</li>
              <li>Check spam/junk folders if emails are not received</li>
              <li>Verify the recipient email address is valid</li>
              <li>Consider using PHPMailer or SMTP for more reliable email delivery</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TestEmail;
