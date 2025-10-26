import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";
import { apiClient } from "@/integrations/api/client";

const TestEmailForm = () => {
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toEmail || !subject || !body) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await apiClient.sendTestEmail({
        to: toEmail,
        subject,
        body,
      });

      toast({
        title: "Email Sent Successfully",
        description: response.message || "Test email has been sent",
      });

      // Clear form on success
      setToEmail("");
      setSubject("");
      setBody("");
    } catch (error: any) {
      console.error("Failed to send test email:", error);
      toast({
        title: "Email Send Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Test Email Sending
        </CardTitle>
        <CardDescription>
          Send a test email to verify your email configuration is working correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="toEmail">To Email Address</Label>
            <Input
              id="toEmail"
              type="email"
              placeholder="recipient@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Test Email Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              placeholder="Enter your test email message here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isSending}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {isSending ? (
              <>
                <Mail className="h-4 w-4 mr-2 animate-pulse" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TestEmailForm;
