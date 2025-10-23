import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Edit,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/integrations/api/client";
import { useAuth } from "@/hooks/useAuth";
import ClientForm from "@/components/forms/ClientForm";
import EditClientForm from "@/components/forms/EditClientForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Clients = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletionInfo, setDeletionInfo] = useState<any>(null);
  const [isDeletionDialogOpen, setIsDeletionDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await apiClient.getClients();
      setClients(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = async (client: any) => {
    try {
      const response = await apiClient.getClientDeletionInfo(
        parseInt(client.id)
      );
      setDeletionInfo(response);
      setClientToDelete(client);
      setIsDeletionDialogOpen(true);
    } catch (error: any) {
      console.error("Failed to fetch deletion info:", error);
      toast({
        title: "Error",
        description: "Failed to load deletion information",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      await apiClient.deleteClient(parseInt(clientToDelete.id));

      toast({
        title: "Success",
        description: "Client and all related data deleted successfully",
      });

      setIsDeletionDialogOpen(false);
      setClientToDelete(null);
      setDeletionInfo(null);
      fetchClients();
    } catch (error: any) {
      console.error("Failed to delete client:", error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge
            variant="default"
            className="bg-success text-success-foreground"
          >
            Active
          </Badge>
        );
      case "blacklisted":
        return <Badge variant="destructive">Blacklisted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
            <p className="text-muted-foreground">
              Manage your client information and contacts
            </p>
          </div>
          <ClientForm
            onSuccess={fetchClients}
            trigger={
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            }
          />
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Client Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading clients...
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clients added yet. Add your first client to start managing
                your contacts!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          {client.name}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </div>
                            )}
                            {client.second_contact && (
                              <div className="text-xs text-muted-foreground">
                                <strong>Alt:</strong> {client.second_contact}
                                {client.second_phone &&
                                  ` (${client.second_phone})`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {client.address || "No address"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {client.notes || "No notes"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(client.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <EditClientForm
                              client={client}
                              onSuccess={fetchClients}
                              trigger={
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                              }
                            />
                            <AlertDialog
                              open={
                                isDeletionDialogOpen &&
                                clientToDelete?.id === client.id
                              }
                              onOpenChange={(open) => {
                                if (!open) {
                                  setIsDeletionDialogOpen(false);
                                  setClientToDelete(null);
                                  setDeletionInfo(null);
                                }
                              }}
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick(client)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete Client
                                  </AlertDialogTitle>
                                  <AlertDialogDescription asChild>
                                    <div>
                                      <p>
                                        This will permanently delete the client{" "}
                                        <strong>{client.name}</strong> and all
                                        related data:
                                      </p>
                                      {deletionInfo && (
                                        <ul className="list-disc list-inside mt-3 space-y-1 bg-destructive/10 p-3 rounded-md">
                                          <li>
                                            <strong>
                                              {
                                                deletionInfo.related_data
                                                  .bookings
                                              }
                                            </strong>{" "}
                                            booking(s)
                                          </li>
                                          <li>
                                            <strong>
                                              {
                                                deletionInfo.related_data
                                                  .invoices
                                              }
                                            </strong>{" "}
                                            invoice(s)
                                          </li>
                                          <li>
                                            <strong>
                                              {
                                                deletionInfo.related_data
                                                  .payments
                                              }
                                            </strong>{" "}
                                            payment schedule(s)
                                          </li>
                                        </ul>
                                      )}
                                      <p className="mt-3 font-semibold text-destructive">
                                        This action cannot be undone.
                                      </p>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDeleteClient}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete Client
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Clients;
