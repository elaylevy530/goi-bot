import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, Save, Users, Search, Check } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

import {
  listGreenApiGroups,
  getDispatchGroups,
  setDispatchGroups,
  type GreenApiGroup,
} from "@/lib/whatsapp-dispatch-groups.functions";
import {
  getAdminNotifyPhoneFn,
  setAdminNotifyPhoneFn,
} from "@/lib/admin-notify-phone.functions";

/**
 * Admin card: pick which WhatsApp groups receive new-job broadcasts.
 * Lists every group the Green API instance is a member of, then persists
 * the two chosen group ids into public.whatsapp_dispatch_settings.
 */
export function DispatchGroupsCard() {
  const listGroupsFn = useServerFn(listGreenApiGroups);
  const getSettingsFn = useServerFn(getDispatchGroups);
  const setSettingsFn = useServerFn(setDispatchGroups);
  const getPhoneFn = useServerFn(getAdminNotifyPhoneFn);
  const setPhoneFn = useServerFn(setAdminNotifyPhoneFn);
  const qc = useQueryClient();

  const groupsQ = useQuery({
    queryKey: ["green-groups"],
    queryFn: () => listGroupsFn(),
  });

  const settingsQ = useQuery({
    queryKey: ["dispatch-groups"],
    queryFn: () => getSettingsFn(),
  });

  const phoneQ = useQuery({
    queryKey: ["admin-notify-phone"],
    queryFn: () => getPhoneFn(),
  });

  const [couriersId, setCouriersId] = useState<string>("");
  const [moversId, setMoversId] = useState<string>("");
  const [couriersQuery, setCouriersQuery] = useState("");
  const [moversQuery, setMoversQuery] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");

  useEffect(() => {
    if (settingsQ.data) {
      setCouriersId(settingsQ.data.couriers_group_id ?? "");
      setMoversId(settingsQ.data.movers_group_id ?? "");
    }
  }, [settingsQ.data]);

  useEffect(() => {
    if (phoneQ.data) setNotifyPhone(phoneQ.data.phone ?? "");
  }, [phoneQ.data]);

  const groups: GreenApiGroup[] = groupsQ.data?.groups ?? [];
  const nameFor = (id: string) => groups.find((g) => g.chatId === id)?.name ?? "";

  const filterGroups = (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return groups;
    return groups.filter(
      (g) => g.name.toLowerCase().includes(s) || g.chatId.toLowerCase().includes(s),
    );
  };
  const couriersList = useMemo(() => filterGroups(couriersQuery), [groups, couriersQuery]);
  const moversList = useMemo(() => filterGroups(moversQuery), [groups, moversQuery]);


  const saveM = useMutation({
    mutationFn: () =>
      setSettingsFn({
        data: {
          couriers_group_id: couriersId || null,
          couriers_group_name: couriersId ? nameFor(couriersId) : null,
          movers_group_id: moversId || null,
          movers_group_name: moversId ? nameFor(moversId) : null,
        },
      }),
    onSuccess: () => {
      toast.success("קבוצות שידור נשמרו");
      qc.invalidateQueries({ queryKey: ["dispatch-groups"] });
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  const savePhoneM = useMutation({
    mutationFn: () => setPhoneFn({ data: { phone: notifyPhone.trim() } }),
    onSuccess: () => {
      toast.success("מספר ההתראות נשמר");
      qc.invalidateQueries({ queryKey: ["admin-notify-phone"] });
    },
    onError: (e: any) => toast.error(String(e?.message ?? e)),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" /> קבוצות שידור משלוחים
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["green-groups"] });
          }}
          disabled={groupsQ.isFetching}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${groupsQ.isFetching ? "animate-spin" : ""}`} />
          רענן רשימה
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          כל משלוח חדש שמשודר יישלח גם לקבוצת הווצאפ המתאימה (משלוח רגיל → קבוצת שליחים,
          הובלה קטנה/גדולה → קבוצת מובילים) עם לינק ישיר למסך העבודה.
        </p>

        {groupsQ.isLoading && <p className="text-sm">טוען קבוצות…</p>}
        {groupsQ.isError && (
          <p className="text-sm text-destructive">
            שגיאה בשליפת קבוצות: {String((groupsQ.error as any)?.message ?? "")}
          </p>
        )}

        {!groupsQ.isLoading && groups.length === 0 && (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded p-3">
            <p className="font-medium mb-1">לא נמצאו קבוצות</p>
            <p className="text-xs">
              המספר של Green API אינו חבר באף קבוצת ווצאפ. פתח בווצאפ קבוצה, הוסף את
              המספר של Green API כחבר, שלח שם הודעת בדיקה, ואז לחץ "רענן רשימה".
            </p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <GroupPicker
            label="קבוצת שליחים (משלוחים רגילים)"
            query={couriersQuery}
            setQuery={setCouriersQuery}
            list={couriersList}
            totalCount={groups.length}
            selectedId={couriersId}
            onSelect={setCouriersId}
          />
          <GroupPicker
            label="קבוצת מובילים (הובלה קטנה/גדולה)"
            query={moversQuery}
            setQuery={setMoversQuery}
            list={moversList}
            totalCount={groups.length}
            selectedId={moversId}
            onSelect={setMoversId}
          />
        </div>


        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={() => saveM.mutate()}
            disabled={saveM.isPending || settingsQ.isLoading}
          >
            <Save className="h-3 w-3 mr-1" />
            {saveM.isPending ? "שומר…" : "שמור"}
          </Button>
          {settingsQ.data?.updated_at && (
            <Badge variant="outline" className="text-xs">
              עודכן: {new Date(settingsQ.data.updated_at).toLocaleString("he-IL")}
            </Badge>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>מספר וואטסאפ לקבלת הצעות מהמובילים</Label>
          <p className="text-xs text-muted-foreground">
            כל מוביל שנכנס ללינק בקבוצה ומשאיר פרטים (לקח את העבודה או שלח הצעת מחיר) —
            ההודעה תגיע למספר הזה.
          </p>
          <div className="flex gap-2">
            <Input
              value={notifyPhone}
              onChange={(e) => setNotifyPhone(e.target.value)}
              placeholder="05X-XXXXXXX"
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={() => savePhoneM.mutate()}
              disabled={savePhoneM.isPending}
            >
              <Save className="h-3 w-3 mr-1" />
              {savePhoneM.isPending ? "שומר…" : "שמור מספר"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupPicker(props: {
  label: string;
  query: string;
  setQuery: (v: string) => void;
  list: GreenApiGroup[];
  totalCount: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { label, query, setQuery, list, totalCount, selectedId, onSelect } = props;
  const selected = list.find((g) => g.chatId === selectedId);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש קבוצה לפי שם…"
          className="pr-8"
          disabled={totalCount === 0}
        />
      </div>
      <div className="border rounded-md max-h-56 overflow-y-auto divide-y bg-background">
        <button
          type="button"
          onClick={() => onSelect("")}
          className={`w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center justify-between ${
            !selectedId ? "bg-muted/60" : ""
          }`}
        >
          <span className="text-muted-foreground">— ללא שידור —</span>
          {!selectedId && <Check className="h-4 w-4 text-primary" />}
        </button>
        {list.map((g) => {
          const active = g.chatId === selectedId;
          return (
            <button
              key={g.chatId}
              type="button"
              onClick={() => onSelect(g.chatId)}
              className={`w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2 ${
                active ? "bg-primary/10" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{g.name}</div>
                <div className="truncate text-[11px] text-muted-foreground" dir="ltr">
                  {g.chatId}
                </div>
              </div>
              {active && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          );
        })}
        {totalCount > 0 && list.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            לא נמצאו קבוצות תואמות לחיפוש
          </div>
        )}
      </div>
      {selected && (
        <div className="text-xs text-muted-foreground">
          נבחר: <span className="font-medium text-foreground">{selected.name}</span>
        </div>
      )}
    </div>
  );
}

