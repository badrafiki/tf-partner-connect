import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Search, Loader2, Inbox, Mail, AlertCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  dlq: "bg-red-100 text-red-800 border-red-200",
  bounced: "bg-orange-100 text-orange-800 border-orange-200",
  complained: "bg-orange-100 text-orange-800 border-orange-200",
  suppressed: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const TEMPLATE_LABELS: Record<string, string> = {
  auth_emails: "Auth (login / reset)",
  "application-approved": "Application approved",
  system: "System",
};

function templateLabel(name: string) {
  return TEMPLATE_LABELS[name] || name;
}

export default function AdminEmails() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [template, setTemplate] = useState<string>("all");

  const { data: stats } = useQuery({
    queryKey: ["admin-email-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_email_log_stats");
      if (error) throw error;
      return data as { status: string; total: number }[];
    },
    refetchInterval: 30_000,
  });

  const { data: dlq } = useQuery({
    queryKey: ["admin-email-dlq"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_email_dlq_stats");
      if (error) throw error;
      return data as { queue_name: string; dlq_count: number }[];
    },
    refetchInterval: 30_000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_email_log_templates");
      if (error) throw error;
      return (data as { template_name: string }[]).map((r) => r.template_name);
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-email-log", search, status, template],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_email_log", {
        p_limit: 200,
        p_offset: 0,
        p_search: search.trim() || null,
        p_status: status === "all" ? null : status,
        p_template: template === "all" ? null : template,
      });
      if (error) throw error;
      return data as LogRow[];
    },
    refetchInterval: 30_000,
  });

  const statByName = (s: string) =>
    stats?.find((r) => r.status === s)?.total ?? 0;

  const totalDlq = (dlq ?? []).reduce((s, r) => s + Number(r.dlq_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Email log</h1>
      </div>

      {totalDlq > 0 && (
        <Card className="p-4 border-destructive/30 bg-destructive/5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-sm">
              {totalDlq} email{totalDlq === 1 ? "" : "s"} failed after retries
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dlq?.map((r) => `${r.queue_name}: ${r.dlq_count}`).join(" · ")}
              {" "}— these will not be retried automatically. Review the failed entries below.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Sent" value={statByName("sent")} tone="green" />
        <StatCard label="Pending" value={statByName("pending")} tone="amber" />
        <StatCard
          label="Failed"
          value={Number(statByName("failed")) + Number(statByName("dlq"))}
          tone="red"
        />
        <StatCard
          label="Suppressed / bounced"
          value={
            Number(statByName("suppressed")) +
            Number(statByName("bounced")) +
            Number(statByName("complained"))
          }
          tone="zinc"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipient or template…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="dlq">Failed (retries exhausted)</SelectItem>
            <SelectItem value="suppressed">Suppressed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="complained">Complaint</SelectItem>
          </SelectContent>
        </Select>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t} value={t}>{templateLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No emails found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters or wait for new emails to be sent.
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Sent</TableHead>
                <TableHead className="hidden lg:table-cell">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.recipient_email}</TableCell>
                  <TableCell className="text-sm">{templateLabel(row.template_name)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[row.status] ?? ""}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{format(new Date(row.created_at), "PPpp")}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-xs">
                    {row.error_message ? (
                      <span className="text-xs text-destructive line-clamp-2">{row.error_message}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeliverabilityPanel />
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" | "zinc" }) {
  const colors: Record<string, string> = {
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
    zinc: "text-zinc-700",
  };
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[tone]}`}>{value}</p>
    </Card>
  );
}

function DeliverabilityPanel() {
  const domain = "notify.partners.total-filtration.com";

  const { data: dns, isLoading } = useQuery({
    queryKey: ["deliverability-dns", domain],
    queryFn: async () => {
      const lookup = async (name: string, type: "TXT" | "CNAME" | "MX") => {
        const res = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
        );
        if (!res.ok) return [];
        const json = await res.json();
        return (json.Answer || []).map((a: { data: string }) => a.data as string);
      };
      const [spf, dkim, dmarc, mx] = await Promise.all([
        lookup(domain, "TXT"),
        lookup(`lovable._domainkey.${domain}`, "TXT"),
        lookup(`_dmarc.${domain}`, "TXT"),
        lookup(domain, "MX"),
      ]);
      return {
        spf: spf.find((r) => r.toLowerCase().includes("v=spf1")) || null,
        dkim: dkim.find((r) => r.toLowerCase().includes("v=dkim1") || r.toLowerCase().includes("k=rsa")) || null,
        dmarc: dmarc.find((r) => r.toLowerCase().includes("v=dmarc1")) || null,
        mx: mx[0] || null,
      };
    },
    staleTime: 60_000,
  });

  const items = [
    { key: "SPF", value: dns?.spf, hint: "Authorizes Lovable to send on behalf of this domain" },
    { key: "DKIM", value: dns?.dkim, hint: "Signs outgoing emails so providers can verify them" },
    { key: "DMARC", value: dns?.dmarc, hint: "Tells inboxes how to handle unauthenticated mail" },
    { key: "MX", value: dns?.mx, hint: "Routes inbound mail (e.g. bounces)" },
  ];

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Deliverability check</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sender domain: <span className="font-mono">{domain}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking DNS…
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-3 text-sm">
              <Badge
                variant="outline"
                className={
                  item.value
                    ? "bg-green-100 text-green-800 border-green-200 w-20 justify-center"
                    : "bg-red-100 text-red-800 border-red-200 w-20 justify-center"
                }
              >
                {item.key} {item.value ? "✓" : "✗"}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{item.hint}</p>
                {item.value && (
                  <p className="text-[11px] font-mono text-muted-foreground/80 truncate mt-0.5">
                    {item.value.replace(/^"|"$/g, "")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">
        DNS is checked live via Google Public DNS. If a record is missing,
        verification may still be in progress — full propagation can take up to 72 hours.
      </p>
    </Card>
  );
}
