const {
  useState,
  useMemo,
  useEffect,
  useRef
} = React;
const appStorage = typeof window.storage !== 'undefined' && window.storage ? window.storage : {
  async get(key) {
    const v = localStorage.getItem(key);
    if (v === null) throw new Error('not found');
    return {
      key,
      value: v
    };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return {
      key,
      value
    };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return {
      key,
      deleted: true
    };
  }
};
const ADMIN_PIN = "1234";
const STAFF_PIN = "5678";
const DEFAULT_USERS = [{
  id: "u1",
  name: "Owner",
  pin: ADMIN_PIN,
  role: "admin"
}, {
  id: "u2",
  name: "Demo staff",
  pin: STAFF_PIN,
  role: "staff"
}];
const normalizePhone = raw => {
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("264")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return "264" + d;
};
const displayPhone = raw => {
  const d = normalizePhone(raw);
  const rest = d.slice(3);
  if (rest.length === 9) return "+264 " + rest.slice(0, 2) + " " + rest.slice(2, 5) + " " + rest.slice(5);
  return "+264 " + rest;
};
const phoneLooksValid = raw => {
  const rest = normalizePhone(raw).slice(3);
  return rest.length >= 8 && rest.length <= 10;
};
const DEFAULT_SERVICES = [{
  id: "ts",
  name: "T-shirt",
  unit: "per item",
  price: 20,
  icon: "👕",
  cat: "Garments"
}, {
  id: "ls",
  name: "Long sleeve shirt",
  unit: "per item",
  price: 25,
  icon: "👔",
  cat: "Garments"
}, {
  id: "tr",
  name: "Trouser / Skirt",
  unit: "per item",
  price: 30,
  icon: "👖",
  cat: "Garments"
}, {
  id: "dr",
  name: "Dress",
  unit: "per item",
  price: 45,
  icon: "👗",
  cat: "Garments"
}, {
  id: "bl",
  name: "Blazer",
  unit: "per item",
  price: 50,
  icon: "🧥",
  cat: "Garments"
}, {
  id: "ja",
  name: "Jacket / Coat",
  unit: "per item",
  price: 60,
  icon: "🧥",
  cat: "Garments"
}, {
  id: "su",
  name: "Complete suit",
  unit: "per item",
  price: 80,
  icon: "🤵",
  cat: "Garments"
}, {
  id: "du",
  name: "Duvet / Blanket",
  unit: "per item",
  price: 120,
  icon: "🛏️",
  cat: "Household"
}, {
  id: "cu",
  name: "Curtains",
  unit: "per item",
  price: 80,
  icon: "🪟",
  cat: "Household"
}, {
  id: "sn",
  name: "Sneaker cleaning",
  unit: "per pair",
  price: 80,
  icon: "👟",
  cat: "Household"
}, {
  id: "p1",
  name: "Pillow case (single)",
  unit: "per item",
  price: 10,
  icon: "🛌",
  cat: "Household"
}, {
  id: "p2",
  name: "Pillow case (double)",
  unit: "per item",
  price: 15,
  icon: "🛌",
  cat: "Household"
}];
const STATUSES = ["Received", "Cleaning", "Ready for collection", "Collected"];
const DONE_STATUS = "Collected";
const SLOTS = ["07:30 – 10:00", "10:00 – 13:00", "13:00 – 16:00", "16:00 – 18:00"];
const DEFAULT_SETTINGS = {
  shopName: "Hint Laundry & Dry Cleaners",
  phone: "+264 81 388 6676",
  location: "Oshikuku, Omusati Region",
  hours: "Mon–Sat, 07:30 – 18:00",
  payMethods: ["Cash", "Card", "Bank payment (EFT)"],
  expressRate: 50,
  slots: ["07:30 – 10:00", "10:00 – 13:00", "13:00 – 16:00", "16:00 – 18:00"],
  turnaroundDays: 1,
  policyDays: 30,
  printFormat: "a4",
  autoBackup: true,
  readyMsg: "Hi {name}! Your laundry order {order} is ready for collection at {shop}. {balance}Our hours: {hours}. See you soon!",
  overdueMsg: "Hi {name}, this is {shop}. Your laundry order {order} has been ready since {date}. {balance}Please collect during our hours: {hours}. Thank you!",
  thanksMsg: "Hi {name}, thank you for your payment on order {order}. {balance}— {shop}",
  slipFooter: "Please keep this slip and present it when collecting your items. Items not collected within {days} days may be released. Thank you!"
};
const shopLine = st => `${st.location} · ${st.phone}`;
const fmt = n => "N$" + Number(n).toFixed(2).replace(/\.00$/, "");
const localISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = () => localISO(new Date());
const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localISO(d);
};
const daysAheadISO = n => {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, n));
  return localISO(d);
};
const computeCollection = (now, defaultDays = 1) => {
  const addDays = n => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return localISO(d);
  };
  if (now.getDay() === 6) {
    return {
      date: addDays(2),
      slot: "14:00 – 15:00"
    };
  }
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 450 && mins < 720) {
    return {
      date: addDays(1),
      slot: "13:00 – 14:00"
    };
  }
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return {
    date: addDays(Math.max(1, defaultDays)),
    slot: `${hh}:${mm}`
  };
};
const label = ts => new Date(ts).toLocaleString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});
const dateLabel = ts => new Date(ts).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric"
});
const T = s => new Date(s).getTime();
let uid = 1;
const newKey = () => "x" + Date.now().toString(36) + uid++;
const seedCustomers = [{
  id: "C-1001",
  name: "Ndapewa Amutenya",
  phone: "+264 81 555 0192",
  address: "Erf 112, Oshikuku",
  ts: T("2026-07-03T09:12")
}];
const seedOrders = [{
  uid: "seed-1041",
  id: "HL-1041",
  customerId: "C-1001",
  customerName: "Ndapewa Amutenya",
  phone: "+264 81 555 0192",
  items: [{
    key: "s1",
    name: "Long sleeve shirt",
    qty: 3,
    price: 25
  }, {
    key: "s2",
    name: "Trouser / Skirt",
    qty: 2,
    price: 30
  }],
  express: false,
  discount: 0,
  collectDate: "2026-07-05",
  collectSlot: SLOTS[2],
  notes: "",
  subtotal: 135,
  expressFee: 0,
  total: 135,
  status: DONE_STATUS,
  takenBy: "Demo",
  statusHistory: [{
    status: "Received",
    ts: T("2026-07-03T09:20"),
    by: "Demo"
  }, {
    status: "Cleaning",
    ts: T("2026-07-03T13:40"),
    by: "Demo"
  }, {
    status: "Ready for collection",
    ts: T("2026-07-04T16:10"),
    by: "Demo"
  }, {
    status: "Collected",
    ts: T("2026-07-05T15:02"),
    by: "Demo"
  }],
  payments: [{
    amount: 135,
    method: "Cash",
    ts: T("2026-07-05T15:03"),
    by: "Demo"
  }],
  ts: T("2026-07-03T09:20")
}, {
  uid: "seed-1042",
  id: "HL-1042",
  customerId: "C-1001",
  customerName: "Ndapewa Amutenya",
  phone: "+264 81 555 0192",
  items: [{
    key: "s3",
    name: "Complete suit",
    qty: 1,
    price: 80
  }, {
    key: "s4",
    name: "Dress",
    qty: 1,
    price: 45
  }],
  express: false,
  discount: 0,
  collectDate: "2026-07-06",
  collectSlot: SLOTS[3],
  notes: "Check suit's left sleeve for a stain.",
  subtotal: 125,
  expressFee: 0,
  total: 125,
  status: "Cleaning",
  takenBy: "Demo",
  statusHistory: [{
    status: "Received",
    ts: T("2026-07-05T11:02"),
    by: "Demo"
  }, {
    status: "Cleaning",
    ts: T("2026-07-05T14:15"),
    by: "Demo"
  }],
  payments: [{
    amount: 50,
    method: "Cash",
    ts: T("2026-07-05T11:50"),
    by: "Demo"
  }],
  ts: T("2026-07-05T11:02")
}];
let orderSeq = 1043;
const STORAGE_KEY = "hint-laundry-v2";
const CLOUD_URL = "https://nktxqlzhqaossvopicne.supabase.co/rest/v1/rpc";
const CLOUD_KEY = "sb_publishable_xCdMgYNtcivjSRbQwqw-kA_d7ihfcNn";
const CLOUD_STORE_KEY = "hint-laundry-cloud";
const META_STORE_KEY = "hint-laundry-sync-meta";
const cloudCall = async (fn, args) => {
  const res = await fetch(`${CLOUD_URL}/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CLOUD_KEY,
      Authorization: `Bearer ${CLOUD_KEY}`
    },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error(`sync-http-${res.status}`);
  return res.json();
};
const hashPin = async (pin, salt) => {
  const bytes = new TextEncoder().encode(`hint-laundry|${salt}|${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};
const pinMatches = async (pin, user) => {
  if (user.pinHash) return (await hashPin(pin, user.id)) === user.pinHash;
  return user.pin === pin;
};
const paidOf = o => o.payments.reduce((a, p) => a + p.amount, 0);
const payState = o => {
  const p = paidOf(o);
  if (p >= o.total) return "paid";
  if (p > 0) return "partial";
  return "unpaid";
};
const balanceOf = o => Math.max(0, o.total - paidOf(o));
const waTo = (phone, text) => `https://wa.me/${String(phone).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
const slipText = (o, st) => {
  const lines = o.items.map(it => `- ${it.qty} x ${it.name} = ${fmt(it.price * it.qty)}`).join("\n");
  return `*${st.shopName}* — Laundry slip\n\nOrder no: *${o.id}*\nDate: ${label(o.ts)}\nCustomer: ${o.customerName}\n\n${lines}\n${o.express ? `Express service: ${fmt(o.expressFee)}\n` : ""}${o.discount > 0 ? `Discount: -${fmt(o.discount)}\n` : ""}Total: *${fmt(o.total)}*\nPaid: ${fmt(paidOf(o))}\nBalance: *${fmt(balanceOf(o))}*\n\nCollection: ${o.collectDate}, ${o.collectSlot}\nPlease bring your slip or quote your order number when collecting. Thank you!`;
};
const receiptText = (o, st) => {
  const lines = o.payments.map(p => `- ${label(p.ts)}: ${fmt(p.amount)} (${p.method})`).join("\n");
  return `${fillTpl(st.thanksMsg, o, st)}\n\n*${st.shopName}* — Receipt R-${o.id}-${o.payments.length}\nOrder no: *${o.id}*\n\n${lines}\n\nOrder total: ${fmt(o.total)}\nTotal paid: *${fmt(paidOf(o))}*\nBalance due: *${fmt(balanceOf(o))}*`;
};
const fillTpl = (tpl, o, st) => tpl.replace(/{name}/g, o.customerName).replace(/{order}/g, o.id).replace(/{shop}/g, st.shopName).replace(/{hours}/g, st.hours).replace(/{date}/g, o.collectDate || "").replace(/{balance}/g, balanceOf(o) > 0 ? `Balance due: *${fmt(balanceOf(o))}*. ` : "It is fully paid. ");
const readyText = (o, st) => fillTpl(st.readyMsg, o, st);
const overdueText = (o, st) => fillTpl(st.overdueMsg, o, st);
const owingText = (o, st) => `Hi ${o.customerName}, this is ${st.shopName}. A balance of *${fmt(balanceOf(o))}* is still owing on laundry order ${o.id}. Please settle it on your next visit. Thank you!`;
function LaundryApp() {
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [currentStaff, setCurrentStaff] = useState("");
  const [role, setRole] = useState("staff");
  const isAdmin = role === "admin";
  const [pinError, setPinError] = useState("");
  const [customers, setCustomers] = useState(seedCustomers);
  const [orders, setOrders] = useState(seedOrders);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [lastBackupTs, setLastBackupTs] = useState(0);
  const [tab, setTab] = useState("dash");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = msg => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [confirmBox, setConfirmBox] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const askConfirm = cfg => {
    setConfirmText("");
    setConfirmBox(cfg);
  };
  const [printing, setPrinting] = useState(null);
  const [edit, setEdit] = useState(null);
  const [cancelDraft, setCancelDraft] = useState(null);
  const restoreInput = useRef(null);
  const [cloud, setCloud] = useState(null);
  const [syncState, setSyncState] = useState("idle");
  const cloudRef = useRef(null);
  const metaRef = useRef({});
  const snapshotRef = useRef({});
  const dirtyRef = useRef(new Set());
  const deletedRef = useRef({});
  const stateRef = useRef({});
  stateRef.current = {
    customers,
    orders,
    services,
    users,
    settings
  };
  const syncBusy = useRef(false);
  const syncTimer = useRef(null);
  const setCloudPersist = cl => {
    cloudRef.current = cl;
    setCloud(cl);
    try {
      if (cl) localStorage.setItem(CLOUD_STORE_KEY, JSON.stringify(cl));else localStorage.removeItem(CLOUD_STORE_KEY);
    } catch (e) {}
  };
  const saveMeta = () => {
    try {
      localStorage.setItem(META_STORE_KEY, JSON.stringify({
        meta: metaRef.current,
        dirty: [...dirtyRef.current],
        deleted: deletedRef.current
      }));
    } catch (e) {}
  };
  const recordKey = (kind, r) => kind + ":" + (kind === "orders" ? r.uid || r.id : r.id);
  const findRecord = (kind, id) => {
    const st = stateRef.current;
    if (kind === "settings") return st.settings;
    if (kind === "orders") return st.orders.find(o => (o.uid || o.id) === id) || null;
    return (st[kind] || []).find(r => r.id === id) || null;
  };
  const diffAndStamp = () => {
    const st = stateRef.current;
    const lists = {
      customers: st.customers,
      orders: st.orders,
      services: st.services,
      users: st.users
    };
    const seen = new Set(["settings:settings"]);
    let changed = false;
    const stamp = (key, json) => {
      snapshotRef.current[key] = json;
      metaRef.current[key] = Date.now();
      dirtyRef.current.add(key);
      changed = true;
    };
    Object.entries(lists).forEach(([kind, arr]) => {
      (arr || []).forEach(r => {
        const key = recordKey(kind, r);
        seen.add(key);
        const json = JSON.stringify(r);
        if (snapshotRef.current[key] !== json) stamp(key, json);
      });
    });
    const sj = JSON.stringify(st.settings);
    if (snapshotRef.current["settings:settings"] !== sj) stamp("settings:settings", sj);
    Object.keys(snapshotRef.current).forEach(key => {
      if (!seen.has(key)) {
        delete snapshotRef.current[key];
        metaRef.current[key] = Date.now();
        deletedRef.current[key] = true;
        dirtyRef.current.add(key);
        changed = true;
      }
    });
    if (changed) {
      saveMeta();
      if (cloudRef.current) {
        clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => doSync(), 2500);
      }
    }
  };
  const resolveDisplayIds = os => {
    const byId = {};
    const sorted = [...os].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    sorted.forEach(o => {
      if (!byId[o.id]) {
        byId[o.id] = o;
        return;
      }
      let suffix = "B",
        next = o.id + suffix;
      while (byId[next]) {
        suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
        next = o.id + suffix;
      }
      o.id = next;
      byId[next] = o;
      const key = recordKey("orders", o);
      metaRef.current[key] = Date.now();
      snapshotRef.current[key] = JSON.stringify(o);
      dirtyRef.current.add(key);
    });
    return os;
  };
  const applyPulled = rows => {
    if (!rows || rows.length === 0) return;
    const byKind = {};
    rows.forEach(r => {
      const key = r.kind + ":" + r.id;
      if ((r.updated_at || 0) <= (metaRef.current[key] || 0)) return;
      (byKind[r.kind] = byKind[r.kind] || []).push(r);
      metaRef.current[key] = r.updated_at;
      if (r.deleted) delete snapshotRef.current[key];else snapshotRef.current[key] = JSON.stringify(r.data);
      dirtyRef.current.delete(key);
      delete deletedRef.current[key];
    });
    const mergeList = (current, pulls, keyOf) => {
      const map = new Map(current.map(r => [keyOf(r), r]));
      pulls.forEach(p => {
        if (p.deleted) map.delete(p.id);else map.set(p.id, p.data);
      });
      return [...map.values()];
    };
    if (byKind.customers) setCustomers(cs => mergeList(cs, byKind.customers, r => r.id));
    if (byKind.services) setServices(sv => mergeList(sv, byKind.services, r => r.id));
    if (byKind.users) setUsers(us => {
      const merged = mergeList(us, byKind.users, r => r.id);
      return merged.length > 0 ? merged : us;
    });
    if (byKind.orders) setOrders(os => {
      const merged = resolveDisplayIds(mergeList(os, byKind.orders, r => r.uid || r.id));
      merged.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      const maxN = merged.reduce((m, o) => {
        const n = parseInt(String(o.id).replace(/\D/g, ""), 10);
        return isNaN(n) ? m : Math.max(m, n);
      }, orderSeq - 1);
      orderSeq = maxN + 1;
      return merged;
    });
    if (byKind.settings) {
      const last = byKind.settings[byKind.settings.length - 1];
      setSettings({
        ...DEFAULT_SETTINGS,
        ...last.data
      });
    }
    saveMeta();
  };
  const doSync = async () => {
    const cl = cloudRef.current;
    if (!cl || syncBusy.current) return;
    syncBusy.current = true;
    setSyncState("syncing");
    try {
      const dirtyKeys = [...dirtyRef.current];
      const changes = dirtyKeys.map(key => {
        const i = key.indexOf(":");
        const kind = key.slice(0, i),
          id = key.slice(i + 1);
        if (deletedRef.current[key]) return {
          kind,
          id,
          data: {},
          updated_at: metaRef.current[key] || Date.now(),
          deleted: true
        };
        const obj = findRecord(kind, id);
        return obj ? {
          kind,
          id,
          data: obj,
          updated_at: metaRef.current[key] || Date.now()
        } : null;
      }).filter(Boolean);
      const out = await cloudCall("laundry_sync", {
        p_shop: cl.shopId,
        p_secret: cl.secret,
        p_since: cl.cursor || 0,
        p_changes: changes
      });
      applyPulled(out.rows || []);
      dirtyKeys.forEach(k => {
        dirtyRef.current.delete(k);
        delete deletedRef.current[k];
      });
      saveMeta();
      setCloudPersist({
        ...cl,
        cursor: out.seq || cl.cursor || 0,
        lastSyncTs: Date.now()
      });
      setSyncState("idle");
    } catch (e) {
      setSyncState(!navigator.onLine || String(e.message || e).includes("fetch") ? "offline" : "error");
    } finally {
      syncBusy.current = false;
    }
  };
  useEffect(() => {
    if (!loaded || !cloud) return;
    const kick = () => doSync();
    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", kick);
    const iv = setInterval(kick, 45000);
    kick();
    return () => {
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", kick);
      clearInterval(iv);
    };
  }, [loaded, cloud ? cloud.shopId : null]);
  useEffect(() => {
    (async () => {
      let base = {
        customers: seedCustomers,
        orders: seedOrders,
        services: DEFAULT_SERVICES,
        users: DEFAULT_USERS,
        settings: DEFAULT_SETTINGS
      };
      try {
        const res = await appStorage.get(STORAGE_KEY);
        if (res?.value) {
          const s = JSON.parse(res.value);
          if (Array.isArray(s.customers)) {
            setCustomers(s.customers);
            base.customers = s.customers;
          }
          if (Array.isArray(s.orders)) {
            const withUids = s.orders.map(o => o.uid ? o : {
              ...o,
              uid: "legacy-" + o.id
            });
            setOrders(withUids);
            base.orders = withUids;
          }
          if (Array.isArray(s.services)) {
            setServices(s.services);
            base.services = s.services;
          }
          if (Array.isArray(s.users) && s.users.length > 0) {
            setUsers(s.users);
            base.users = s.users;
          }
          if (s.settings && typeof s.settings === "object") {
            const st = {
              ...DEFAULT_SETTINGS,
              ...s.settings
            };
            setSettings(st);
            base.settings = st;
          }
          if (s.lastBackupTs) setLastBackupTs(s.lastBackupTs);
          const maxOrder = (s.orders || []).reduce((m, o) => {
            const n = parseInt(String(o.id).replace(/\D/g, ""), 10);
            return isNaN(n) ? m : Math.max(m, n);
          }, orderSeq - 1);
          orderSeq = maxOrder + 1;
        }
      } catch (e) {}
      ["customers", "orders", "services", "users"].forEach(kind => {
        base[kind].forEach(r => {
          snapshotRef.current[recordKey(kind, r)] = JSON.stringify(r);
        });
      });
      snapshotRef.current["settings:settings"] = JSON.stringify(base.settings);
      try {
        const cl = JSON.parse(localStorage.getItem(CLOUD_STORE_KEY));
        if (cl && cl.shopId && cl.secret) {
          cloudRef.current = cl;
          setCloud(cl);
        }
      } catch (e) {}
      try {
        const m = JSON.parse(localStorage.getItem(META_STORE_KEY));
        if (m && m.meta) {
          metaRef.current = m.meta;
          dirtyRef.current = new Set(m.dirty || []);
          deletedRef.current = m.deleted || {};
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      try {
        await appStorage.set(STORAGE_KEY, JSON.stringify({
          customers,
          orders,
          services,
          users,
          settings,
          lastBackupTs
        }));
      } catch (e) {
        console.error("Save failed:", e);
      }
      diffAndStamp();
    }, 400);
    return () => clearTimeout(t);
  }, [loaded, customers, orders, services, users, settings, lastBackupTs]);
  const doResetAllData = async () => {
    try {
      await appStorage.delete(STORAGE_KEY);
    } catch (e) {}
    setCustomers(seedCustomers);
    setOrders(seedOrders);
    setServices(DEFAULT_SERVICES);
    setUsers(DEFAULT_USERS);
    setSettings(DEFAULT_SETTINGS);
    setLastBackupTs(0);
    orderSeq = 1043;
    flash("All data reset to the demo starting point.");
  };
  const resetAllData = () => askConfirm({
    title: "Reset all data?",
    body: `This permanently deletes every order (${orders.length}), customer (${customers.length}), payment and setting${cloudRef.current ? " — including the shop's cloud copy shared with other devices" : " on this device"} — and restores the demo data. This cannot be undone.`,
    requireText: "RESET",
    confirmLabel: "Delete everything",
    danger: true,
    onConfirm: doResetAllData
  });
  const backupData = (auto = false) => {
    const payload = {
      app: "hint-laundry",
      version: 2,
      exportedAt: new Date().toISOString(),
      customers,
      orders,
      services,
      users,
      settings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hint-laundry-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setLastBackupTs(Date.now());
    flash(auto ? "Daily auto-backup downloaded — keep the file safe." : "Backup file downloaded — keep it somewhere safe.");
  };
  const applyRestore = s => {
    setCustomers(s.customers);
    setOrders(s.orders);
    setServices(s.services);
    if (Array.isArray(s.users) && s.users.length > 0) setUsers(s.users);
    if (s.settings && typeof s.settings === "object") setSettings({
      ...DEFAULT_SETTINGS,
      ...s.settings
    });
    const maxOrder = s.orders.reduce((m, o) => {
      const n = parseInt(String(o.id).replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 1042);
    orderSeq = maxOrder + 1;
    flash("Backup restored.");
  };
  const restoreData = file => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const s = JSON.parse(reader.result);
        if (!Array.isArray(s.customers) || !Array.isArray(s.orders) || !Array.isArray(s.services)) throw new Error("bad file");
        const when = s.exportedAt ? dateLabel(s.exportedAt) : "an unknown date";
        askConfirm({
          title: "Restore this backup?",
          body: `The backup "${file.name}" from ${when} contains ${s.orders.length} orders and ${s.customers.length} customers. It will replace everything currently in the app (${orders.length} orders, ${customers.length} customers).`,
          confirmLabel: "Replace with backup",
          danger: true,
          onConfirm: () => applyRestore(s)
        });
      } catch (e) {
        flash("That file doesn't look like a Hint Laundry backup.");
      }
    };
    reader.readAsText(file);
  };
  const [joinCode, setJoinCode] = useState("");
  const markAllDirty = () => {
    const st = stateRef.current;
    ["customers", "orders", "services", "users"].forEach(kind => {
      (st[kind] || []).forEach(r => {
        const key = recordKey(kind, r);
        snapshotRef.current[key] = JSON.stringify(r);
        metaRef.current[key] = Date.now();
        dirtyRef.current.add(key);
      });
    });
    snapshotRef.current["settings:settings"] = JSON.stringify(st.settings);
    metaRef.current["settings:settings"] = Date.now();
    dirtyRef.current.add("settings:settings");
    saveMeta();
  };
  const enableCloud = async () => {
    try {
      setSyncState("syncing");
      const out = await cloudCall("laundry_create_shop", {
        p_name: settings.shopName
      });
      setCloudPersist({
        shopId: out.shop_id,
        secret: out.secret,
        cursor: 0,
        lastSyncTs: 0
      });
      markAllDirty();
      flash("Cloud sync is on — this device's records are being uploaded now.");
      setTimeout(() => doSync(), 100);
    } catch (e) {
      setSyncState("error");
      flash("Couldn't reach the sync server — check the internet connection and try again.");
    }
  };
  const joinCloud = () => {
    const m = joinCode.trim().match(/^([0-9a-f-]{36})\.([0-9a-f-]{36})$/i);
    if (!m) {
      flash("That doesn't look like a link code — copy it exactly from the other device's Settings.");
      return;
    }
    askConfirm({
      title: "Connect to the shop's cloud records?",
      body: "This device will join the shared shop. Whatever is on this device now (demo or old records) will be replaced by the shop's cloud data, and you'll sign in again with your shop PIN.",
      confirmLabel: "Connect",
      onConfirm: async () => {
        try {
          setSyncState("syncing");
          const out = await cloudCall("laundry_sync", {
            p_shop: m[1],
            p_secret: m[2],
            p_since: 0,
            p_changes: []
          });
          const rows = out.rows || [];
          const pick = (kind, fallback) => {
            const rs = rows.filter(r => r.kind === kind && !r.deleted);
            return rs.length ? rs.map(r => r.data) : fallback;
          };
          metaRef.current = {};
          snapshotRef.current = {};
          dirtyRef.current = new Set();
          deletedRef.current = {};
          rows.forEach(r => {
            const key = r.kind + ":" + r.id;
            metaRef.current[key] = r.updated_at;
            if (!r.deleted) snapshotRef.current[key] = JSON.stringify(r.data);
          });
          const newOrders = pick("orders", []);
          newOrders.sort((a, b) => (b.ts || 0) - (a.ts || 0));
          setCustomers(pick("customers", []));
          setOrders(newOrders);
          setServices(pick("services", DEFAULT_SERVICES));
          setUsers(pick("users", DEFAULT_USERS));
          const sRow = rows.filter(r => r.kind === "settings" && !r.deleted).pop();
          setSettings(sRow ? {
            ...DEFAULT_SETTINGS,
            ...sRow.data
          } : DEFAULT_SETTINGS);
          orderSeq = newOrders.reduce((mx, o) => {
            const n = parseInt(String(o.id).replace(/\D/g, ""), 10);
            return isNaN(n) ? mx : Math.max(mx, n);
          }, 1042) + 1;
          saveMeta();
          setCloudPersist({
            shopId: m[1],
            secret: m[2],
            cursor: out.seq || 0,
            lastSyncTs: Date.now()
          });
          setJoinCode("");
          setSyncState("idle");
          setUnlocked(false);
          setCurrentStaff("");
          setCurrentUserId(null);
          flash("Connected — sign in with your shop PIN.");
        } catch (e) {
          setSyncState("error");
          flash(String(e.message || "").includes("sync-http-4") ? "That link code was not accepted — check it and try again." : "Couldn't reach the sync server — check the internet connection and try again.");
        }
      }
    });
  };
  const disconnectCloud = () => askConfirm({
    title: "Disconnect from cloud sync?",
    body: "This device keeps everything it has now, but stops sharing with the other devices. You can reconnect anytime with the link code.",
    confirmLabel: "Disconnect",
    danger: true,
    onConfirm: () => {
      setCloudPersist(null);
      setSyncState("idle");
      flash("Cloud sync is off for this device.");
    }
  });
  const linkCode = cloud ? `${cloud.shopId}.${cloud.secret}` : "";
  const copyLinkCode = async () => {
    try {
      await navigator.clipboard.writeText(linkCode);
      flash("Link code copied — paste it in Settings on the other device.");
    } catch (e) {
      flash("Couldn't copy automatically — select and copy the code shown below.");
    }
  };
  const trackUrl = o => cloudRef.current ? new URL("status.html", window.location.href).href + `?shop=${cloudRef.current.shopId}&order=${encodeURIComponent(o.id)}` : null;
  const withTrack = (text, o) => {
    const u = trackUrl(o);
    return u ? `${text}\n\nTrack your order here: ${u}` : text;
  };
  const stampOrder = (orderId, field) => setOrders(os => os.map(o => o.id === orderId ? {
    ...o,
    [field]: Date.now()
  } : o));
  const [newMethod, setNewMethod] = useState("");
  const [newSlot, setNewSlot] = useState("");
  const previewOrder = {
    customerName: "Ndapewa",
    id: "HL-1050",
    payments: [],
    total: 125,
    collectDate: todayISO()
  };
  const [svcDraft, setSvcDraft] = useState({
    name: "",
    price: "",
    unit: "per item",
    cat: "Garments"
  });
  const addService = () => {
    const name = svcDraft.name.trim();
    const price = parseFloat(svcDraft.price);
    if (!name) {
      flash("Give the item a name.");
      return;
    }
    if (!price || price <= 0) {
      flash("Give the item a price.");
      return;
    }
    if (services.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      flash("That item is already on the list.");
      return;
    }
    setServices(sv => [...sv, {
      id: newKey(),
      name,
      unit: svcDraft.unit,
      price,
      icon: "🧼",
      cat: svcDraft.cat
    }]);
    setSvcDraft({
      name: "",
      price: "",
      unit: "per item",
      cat: svcDraft.cat
    });
    flash(`${name} added to the price list.`);
  };
  const removeService = id => {
    const s = services.find(x => x.id === id);
    if (!s) return;
    askConfirm({
      title: `Remove ${s.name}?`,
      body: "It disappears from the price list for new orders. Existing orders keep it on their slips.",
      confirmLabel: "Remove item",
      danger: true,
      onConfirm: () => {
        setServices(sv => sv.filter(x => x.id !== id));
        setCart(c => {
          const n = {
            ...c
          };
          delete n[id];
          return n;
        });
        flash(`${s.name} removed. Existing orders keep it on their slips.`);
      }
    });
  };
  const priceFileInput = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const parsePriceFile = file => {
    if (typeof XLSX === "undefined") {
      flash("Excel support didn't load — check your internet connection and reload the app.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, {
          type: "array"
        });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: ""
        });
        const norm = v => String(v).toLowerCase().replace(/[^a-z]/g, "");
        let hi = -1,
          col = null;
        for (let i = 0; i < Math.min(raw.length, 10); i++) {
          const cells = (raw[i] || []).map(norm);
          const iItem = cells.findIndex(c => c === "item" || c === "itemname" || c === "service" || c === "name");
          const iPrice = cells.findIndex(c => c.startsWith("price"));
          if (iItem >= 0 && iPrice >= 0) {
            hi = i;
            col = {
              code: cells.findIndex(c => c === "servicecode" || c === "code"),
              item: iItem,
              unit: cells.findIndex(c => c === "unit"),
              price: iPrice,
              cat: cells.findIndex(c => c === "category" || c === "cat")
            };
            break;
          }
        }
        if (!col) {
          flash("Couldn't find the header row — the file needs columns: Service Code, Item, Unit, Price (N$).");
          return;
        }
        const rows = [];
        let skipped = 0;
        for (let i = hi + 1; i < raw.length; i++) {
          const r = raw[i] || [];
          if (!r.join("").trim()) continue;
          const name = String(r[col.item] ?? "").trim();
          const price = parseFloat(String(r[col.price] ?? "").replace(/[^\d.]/g, ""));
          if (!name || isNaN(price) || price <= 0) {
            skipped++;
            continue;
          }
          rows.push({
            code: col.code >= 0 ? String(r[col.code] ?? "").trim() : "",
            name,
            unit: col.unit >= 0 && String(r[col.unit] ?? "").trim() || "per item",
            price,
            cat: col.cat >= 0 && String(r[col.cat] ?? "").trim() || ""
          });
        }
        if (!rows.length) {
          flash("No usable rows found — check that Item and Price are filled in.");
          return;
        }
        let updated = 0,
          added = 0;
        const classified = rows.map(row => {
          const match = services.find(s => row.code && String(s.code || s.id).toLowerCase() === row.code.toLowerCase() || s.name.toLowerCase() === row.name.toLowerCase());
          if (match) {
            updated++;
            return {
              ...row,
              action: "update",
              targetId: match.id
            };
          }
          added++;
          return {
            ...row,
            action: "add"
          };
        });
        setImportPreview({
          rows: classified,
          updated,
          added,
          skipped,
          fileName: file.name
        });
      } catch (e) {
        flash("Couldn't read that file — save it as .xlsx in Excel and try again.");
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const applyImport = () => {
    if (!importPreview) return;
    setServices(sv => {
      let next = [...sv];
      importPreview.rows.forEach(row => {
        if (row.action === "update") {
          next = next.map(s => s.id === row.targetId ? {
            ...s,
            name: row.name,
            unit: row.unit,
            price: row.price,
            code: row.code || s.code,
            cat: row.cat || s.cat
          } : s);
        } else {
          next.push({
            id: newKey(),
            code: row.code || undefined,
            name: row.name,
            unit: row.unit,
            price: row.price,
            icon: "🧼",
            cat: row.cat || "Garments"
          });
        }
      });
      return next;
    });
    flash(`Price list imported — ${importPreview.updated} updated, ${importPreview.added} added${importPreview.skipped ? `, ${importPreview.skipped} skipped` : ""}.`);
    setImportPreview(null);
  };
  const exportPriceList = () => {
    if (typeof XLSX === "undefined") {
      flash("Excel support didn't load — check your internet connection and reload the app.");
      return;
    }
    const data = services.map(s => ({
      "Service Code": String(s.code || s.id).toUpperCase(),
      "Item": s.name,
      "Unit": s.unit,
      "Price (N$)": s.price,
      "Category": s.cat || ""
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{
      wch: 12
    }, {
      wch: 28
    }, {
      wch: 10
    }, {
      wch: 10
    }, {
      wch: 12
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Price list");
    XLSX.writeFile(wb, `hint-laundry-prices-${todayISO()}.xlsx`);
    flash("Price list downloaded as Excel — edit it and import it back anytime.");
  };
  const [userDraft, setUserDraft] = useState({
    name: "",
    pin: "",
    role: "staff"
  });
  const addUser = async () => {
    const name = userDraft.name.trim();
    const pin = userDraft.pin.trim();
    if (!name) {
      flash("Give the person a name.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      flash("PIN must be 4–6 digits.");
      return;
    }
    if (await pinTaken(pin, null)) {
      flash("That PIN is already taken — pick a different one.");
      return;
    }
    const id = newKey();
    const pinHash = await hashPin(pin, id);
    setUsers(us => [...us, {
      id,
      name,
      pinHash,
      role: userDraft.role
    }]);
    setUserDraft({
      name: "",
      pin: "",
      role: "staff"
    });
    flash(`${name} added — they sign in with their own PIN.`);
  };
  const removeUser = id => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    if (id === currentUserId) {
      flash("You can't remove yourself while signed in.");
      return;
    }
    if (u.role === "admin" && users.filter(x => x.role === "admin").length <= 1) {
      flash("There must always be at least one owner.");
      return;
    }
    askConfirm({
      title: `Remove ${u.name}?`,
      body: "They will no longer be able to sign in. Orders they handled keep their name on record.",
      confirmLabel: "Remove person",
      danger: true,
      onConfirm: () => {
        setUsers(us => us.filter(x => x.id !== id));
        flash(`${u.name} removed.`);
      }
    });
  };
  const [userEdit, setUserEdit] = useState(null);
  const pinTaken = async (pin, exceptId) => {
    for (const u of users) {
      if (u.id !== exceptId && (await pinMatches(pin, u))) return true;
    }
    return false;
  };
  const saveUserEdit = async () => {
    if (!userEdit) return;
    const name = userEdit.name.trim();
    const pin = userEdit.pin.trim();
    if (!name) {
      flash("Give the person a name.");
      return;
    }
    if (pin && !/^\d{4,6}$/.test(pin)) {
      flash("PIN must be 4–6 digits.");
      return;
    }
    if (pin && (await pinTaken(pin, userEdit.id))) {
      flash("That PIN is already taken — pick a different one.");
      return;
    }
    const pinHash = pin ? await hashPin(pin, userEdit.id) : null;
    setUsers(us => us.map(u => u.id === userEdit.id ? pinHash ? {
      ...u,
      name,
      pinHash,
      pin: undefined
    } : {
      ...u,
      name
    } : u));
    if (userEdit.id === currentUserId) setCurrentStaff(name);
    setUserEdit(null);
    flash(pin ? `Saved — ${name} signs in with the new PIN from now on.` : "Saved.");
  };
  const [defaultPinsActive, setDefaultPinsActive] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      if (users.some(u => u.pin && !u.pinHash)) {
        const converted = await Promise.all(users.map(async u => {
          if (!u.pin || u.pinHash) return u;
          const {
            pin,
            ...rest
          } = u;
          return {
            ...rest,
            pinHash: await hashPin(pin, u.id)
          };
        }));
        setUsers(converted);
        return;
      }
      const flags = await Promise.all(users.map(async u => (await pinMatches(ADMIN_PIN, u)) || (await pinMatches(STAFF_PIN, u))));
      setDefaultPinsActive(flags.some(Boolean));
    })();
  }, [loaded, users]);
  const [sel, setSel] = useState({
    customerId: "",
    name: "",
    phone: "",
    address: "",
    newMode: false
  });
  const [custQuery, setCustQuery] = useState("");
  const [custFocus, setCustFocus] = useState(false);
  const [custHi, setCustHi] = useState(-1);
  const custResults = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return [...customers].sort((a, b) => a.name.localeCompare(b.name));
    const qDigits = q.replace(/\D/g, "").replace(/^0+/, "");
    return customers.filter(c => {
      if (c.name.toLowerCase().includes(q)) return true;
      if (qDigits.length < 3) return false;
      const d = String(c.phone).replace(/\D/g, "");
      const local = d.startsWith("264") ? d.slice(3) : d.replace(/^0+/, "");
      return local.includes(qDigits) || d.includes(qDigits);
    }).slice(0, 8);
  }, [custQuery, customers]);
  const selectedCustomer = customers.find(c => c.id === sel.customerId) || null;
  const pickCustomer = c => {
    setSel({
      customerId: c.id,
      name: "",
      phone: "",
      address: "",
      newMode: false
    });
    setCustQuery("");
  };
  const startNewCustomer = () => {
    const q = custQuery.trim();
    const isNumber = /^\+?[\d\s-]+$/.test(q);
    setSel({
      customerId: "",
      name: isNumber ? "" : q,
      phone: isNumber ? q : "",
      address: "",
      newMode: true
    });
    setCustQuery("");
  };
  const [cart, setCart] = useState({});
  const [customLines, setCustomLines] = useState([]);
  const [customDraft, setCustomDraft] = useState({
    name: "",
    price: ""
  });
  const [express, setExpress] = useState(false);
  const [discount, setDiscount] = useState("");
  const [collect, setCollect] = useState(() => computeCollection(new Date(), DEFAULT_SETTINGS.turnaroundDays));
  const [notes, setNotes] = useState("");
  const [payNow, setPayNow] = useState({
    amount: "",
    method: DEFAULT_SETTINGS.payMethods[0]
  });
  const clearTicket = () => {
    setCart({});
    setCustomLines([]);
    setExpress(false);
    setDiscount("");
    setNotes("");
    setPayNow({
      amount: "",
      method: settings.payMethods[0]
    });
    setCollect(computeCollection(new Date(), settings.turnaroundDays));
    setTriedCreate(false);
    flash("Ticket cleared.");
  };
  useEffect(() => {
    if (tab === "new" && Object.keys(cart).length === 0 && customLines.length === 0) {
      setCollect(computeCollection(new Date(), settings.turnaroundDays));
    }
  }, [tab]);
  const setQty = (id, qty) => setCart(c => {
    const next = {
      ...c
    };
    if (qty <= 0) delete next[id];else next[id] = qty;
    return next;
  });
  const addCustom = () => {
    const price = parseFloat(customDraft.price);
    if (!customDraft.name.trim() || !price || price <= 0) {
      flash("Give the custom item a name and a price.");
      return;
    }
    setCustomLines(ls => [...ls, {
      key: newKey(),
      name: customDraft.name.trim(),
      price,
      qty: 1
    }]);
    setCustomDraft({
      name: "",
      price: ""
    });
  };
  const setCustomQty = (key, qty) => setCustomLines(ls => qty <= 0 ? ls.filter(l => l.key !== key) : ls.map(l => l.key === key ? {
    ...l,
    qty
  } : l));
  const cartLines = [...Object.entries(cart).map(([id, qty]) => {
    const s = services.find(x => x.id === id);
    return {
      key: id,
      name: s.name,
      price: s.price,
      qty,
      line: s.price * qty
    };
  }), ...customLines.map(l => ({
    ...l,
    line: l.price * l.qty
  }))];
  const subtotal = cartLines.reduce((a, l) => a + l.line, 0);
  const expressFee = express ? Math.round(subtotal * (settings.expressRate / 100)) : 0;
  const discountVal = Math.min(parseFloat(discount) || 0, subtotal + expressFee);
  const total = Math.max(0, subtotal + expressFee - discountVal);
  const orderProblems = () => {
    const probs = [];
    if (cartLines.length === 0) probs.push("Add at least one item.");
    if (!customers.find(c => c.id === sel.customerId)) {
      if (!sel.newMode) probs.push("Search for the customer above, or tap “Register new customer”.");else {
        if (!sel.name.trim()) probs.push("Enter the new customer's name.");
        if (!sel.phone.trim()) probs.push("Enter the new customer's phone number.");else if (!phoneLooksValid(sel.phone)) probs.push("Check the phone number — just the local number, e.g. 0813886676.");
      }
    }
    return probs;
  };
  const [triedCreate, setTriedCreate] = useState(false);
  const createOrder = custOverride => {
    const probs = orderProblems();
    if (probs.length > 0) {
      setTriedCreate(true);
      flash(probs[0]);
      return;
    }
    let cust = custOverride || customers.find(c => c.id === sel.customerId);
    if (!cust) {
      const dupe = customers.find(c => String(c.phone).replace(/\D/g, "") === normalizePhone(sel.phone));
      if (dupe) {
        askConfirm({
          title: "Number already registered",
          body: `${displayPhone(sel.phone)} belongs to ${dupe.name}. Use their existing record for this order? (If it's a different person, go back and check the number.)`,
          confirmLabel: `Use ${dupe.name}`,
          onConfirm: () => {
            pickCustomer(dupe);
            createOrder(dupe);
          }
        });
        return;
      }
      cust = {
        id: nextCustomerId(customers),
        name: sel.name.trim(),
        phone: displayPhone(sel.phone),
        address: sel.address.trim() || "Oshikuku",
        ts: Date.now()
      };
      setCustomers(cs => [...cs, cust]);
    }
    const id = "HL-" + orderSeq++;
    const now = Date.now();
    const payments = [];
    const amt = parseFloat(payNow.amount);
    if (amt > 0) payments.push({
      amount: amt,
      method: payNow.method,
      ts: now,
      by: currentStaff
    });
    const order = {
      uid: newKey(),
      id,
      customerId: cust.id,
      customerName: cust.name,
      phone: cust.phone,
      items: cartLines.map(l => ({
        key: l.key,
        name: l.name,
        qty: l.qty,
        price: l.price
      })),
      express,
      discount: discountVal,
      collectDate: collect.date,
      collectSlot: collect.slot,
      notes: notes.trim(),
      subtotal,
      expressFee,
      total,
      status: "Received",
      takenBy: currentStaff,
      statusHistory: [{
        status: "Received",
        ts: now,
        by: currentStaff
      }],
      payments,
      ts: now
    };
    setOrders(os => [order, ...os]);
    setCart({});
    setCustomLines([]);
    setExpress(false);
    setDiscount("");
    setNotes("");
    setSel({
      customerId: "",
      name: "",
      phone: "",
      address: "",
      newMode: false
    });
    setCustQuery("");
    setCollect(computeCollection(new Date(), settings.turnaroundDays));
    setPayNow({
      amount: "",
      method: settings.payMethods[0]
    });
    setTriedCreate(false);
    setPrinting({
      type: "slip",
      orderId: id
    });
    flash(`Order ${id} created by ${currentStaff}.`);
  };
  const advanceStatus = orderId => {
    setOrders(os => os.map(o => {
      if (o.id !== orderId || o.cancelled) return o;
      const idx = STATUSES.indexOf(o.status);
      if (idx >= STATUSES.length - 1) return o;
      const next = STATUSES[idx + 1];
      return {
        ...o,
        status: next,
        statusHistory: [...o.statusHistory, {
          status: next,
          ts: Date.now(),
          by: currentStaff
        }]
      };
    }));
  };
  const [payDraft, setPayDraft] = useState({});
  const recordPayment = orderId => {
    const draft = payDraft[orderId] || {};
    const amount = parseFloat(draft.amount);
    if (!amount || amount <= 0) {
      flash("Enter the amount received.");
      return;
    }
    const method = draft.method || settings.payMethods[0];
    setOrders(os => os.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        payments: [...o.payments, {
          amount,
          method,
          ts: Date.now(),
          by: currentStaff
        }]
      };
    }));
    setPayDraft(d => ({
      ...d,
      [orderId]: {
        amount: "",
        method
      }
    }));
    setPrinting({
      type: "receipt",
      orderId
    });
  };
  const doReversePayment = (orderId, index) => {
    setOrders(os => os.map(o => {
      if (o.id !== orderId) return o;
      const p = o.payments[index];
      if (!p || p.amount < 0 || p.reversed) return o;
      const payments = o.payments.map((x, i) => i === index ? {
        ...x,
        reversed: true
      } : x);
      payments.push({
        amount: -p.amount,
        method: p.method,
        ts: Date.now(),
        by: currentStaff,
        reversalOf: index
      });
      return {
        ...o,
        payments
      };
    }));
    flash("Payment reversed — the correction is on the record.");
  };
  const reversePayment = (orderId, index) => {
    const o = orders.find(x => x.id === orderId);
    const p = o && o.payments[index];
    if (!p) return;
    askConfirm({
      title: "Reverse this payment?",
      body: `${fmt(p.amount)} (${p.method}) on ${orderId} will get a correcting entry on the record. Do this only if the payment was recorded in error or refunded to the customer.`,
      confirmLabel: "Reverse payment",
      danger: true,
      onConfirm: () => doReversePayment(orderId, index)
    });
  };
  const stepBackStatus = orderId => {
    setOrders(os => os.map(o => {
      if (o.id !== orderId || o.cancelled) return o;
      const idx = STATUSES.indexOf(o.status);
      if (idx <= 0) return o;
      const prev = STATUSES[idx - 1];
      return {
        ...o,
        status: prev,
        statusHistory: [...o.statusHistory, {
          status: prev,
          ts: Date.now(),
          by: currentStaff,
          back: true
        }]
      };
    }));
    flash("Stepped back one status — the correction is on the record.");
  };
  const canStepBack = o => {
    const idx = STATUSES.indexOf(o.status);
    if (idx <= 0 || o.cancelled) return false;
    if (isAdmin) return true;
    const last = o.statusHistory[o.statusHistory.length - 1];
    return last && Date.now() - last.ts < 15 * 60000;
  };
  const confirmCancel = () => {
    if (!cancelDraft) return;
    const reason = (cancelDraft.reason || "").trim();
    if (!reason) {
      flash("Give a short reason for cancelling.");
      return;
    }
    setOrders(os => os.map(o => o.id === cancelDraft.orderId ? {
      ...o,
      cancelled: {
        reason,
        ts: Date.now(),
        by: currentStaff
      }
    } : o));
    setCancelDraft(null);
    flash("Order cancelled. It stays on record but is excluded from sales.");
  };
  const openEdit = o => {
    setEdit({
      orderId: o.id,
      lines: o.items.map(it => ({
        key: it.key || newKey(),
        name: it.name,
        price: it.price,
        qty: it.qty
      })),
      addId: "",
      customDraft: {
        name: "",
        price: ""
      },
      express: o.express,
      discount: o.discount ? String(o.discount) : "",
      collectDate: o.collectDate,
      collectSlot: o.collectSlot,
      notes: o.notes || ""
    });
  };
  const editSetQty = (key, qty) => setEdit(e => ({
    ...e,
    lines: qty <= 0 ? e.lines.filter(l => l.key !== key) : e.lines.map(l => l.key === key ? {
      ...l,
      qty
    } : l)
  }));
  const editAddService = () => {
    setEdit(e => {
      if (!e.addId) return e;
      const s = services.find(x => x.id === e.addId);
      return {
        ...e,
        addId: "",
        lines: [...e.lines, {
          key: newKey(),
          name: s.name,
          price: s.price,
          qty: 1
        }]
      };
    });
  };
  const editAddCustom = () => {
    setEdit(e => {
      const price = parseFloat(e.customDraft.price);
      if (!e.customDraft.name.trim() || !price || price <= 0) {
        flash("Give the custom item a name and a price.");
        return e;
      }
      return {
        ...e,
        customDraft: {
          name: "",
          price: ""
        },
        lines: [...e.lines, {
          key: newKey(),
          name: e.customDraft.name.trim(),
          price,
          qty: 1
        }]
      };
    });
  };
  const saveEdit = () => {
    if (!edit) return;
    if (edit.lines.length === 0) {
      flash("An order needs at least one item — or cancel it instead.");
      return;
    }
    const sub = edit.lines.reduce((a, l) => a + l.price * l.qty, 0);
    const exFee = edit.express ? Math.round(sub * (settings.expressRate / 100)) : 0;
    const disc = Math.min(parseFloat(edit.discount) || 0, sub + exFee);
    const tot = Math.max(0, sub + exFee - disc);
    setOrders(os => os.map(o => o.id === edit.orderId ? {
      ...o,
      items: edit.lines.map(l => ({
        key: l.key,
        name: l.name,
        qty: l.qty,
        price: l.price
      })),
      express: edit.express,
      discount: disc,
      collectDate: edit.collectDate,
      collectSlot: edit.collectSlot,
      notes: edit.notes.trim(),
      subtotal: sub,
      expressFee: exFee,
      total: tot,
      editedTs: Date.now(),
      editedBy: currentStaff
    } : o));
    setEdit(null);
    flash("Order updated.");
  };
  const editSub = edit ? edit.lines.reduce((a, l) => a + l.price * l.qty, 0) : 0;
  const editFee = edit && edit.express ? Math.round(editSub * (settings.expressRate / 100)) : 0;
  const editDisc = edit ? Math.min(parseFloat(edit.discount) || 0, editSub + editFee) : 0;
  const editTotal = edit ? Math.max(0, editSub + editFee - editDisc) : 0;
  const [custEdit, setCustEdit] = useState(null);
  const [custDraft, setCustDraft] = useState({
    name: "",
    phone: "",
    address: ""
  });
  const nextCustomerId = cs => {
    const maxN = cs.reduce((m, c) => {
      const n = parseInt(String(c.id).replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 1000);
    return "C-" + (maxN + 1);
  };
  const addCustomer = () => {
    const name = custDraft.name.trim();
    if (!name || !custDraft.phone.trim()) {
      flash("Enter the customer's name and phone.");
      return;
    }
    if (!phoneLooksValid(custDraft.phone)) {
      flash("Check the phone number — just the local number, e.g. 0813886676.");
      return;
    }
    const phone = displayPhone(custDraft.phone);
    const dup = customers.find(c => String(c.phone).replace(/\D/g, "") === phone.replace(/\D/g, ""));
    if (dup) {
      flash(`That phone number is already registered to ${dup.name}.`);
      return;
    }
    setCustomers(cs => [...cs, {
      id: nextCustomerId(cs),
      name,
      phone,
      address: custDraft.address.trim() || "Oshikuku",
      ts: Date.now()
    }]);
    setCustDraft({
      name: "",
      phone: "",
      address: ""
    });
    flash(`${name} added — they'll appear in the New order customer search.`);
  };
  const [custTabQuery, setCustTabQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const q = custTabQuery.trim().toLowerCase();
    if (!q) return customers;
    const qDigits = q.replace(/\D/g, "").replace(/^0+/, "");
    return customers.filter(c => {
      if (c.name.toLowerCase().includes(q)) return true;
      if ((c.address || "").toLowerCase().includes(q)) return true;
      if (qDigits.length < 3) return false;
      const d = String(c.phone).replace(/\D/g, "");
      const local = d.startsWith("264") ? d.slice(3) : d.replace(/^0+/, "");
      return local.includes(qDigits) || d.includes(qDigits);
    });
  }, [custTabQuery, customers]);
  const saveCustEdit = () => {
    if (!custEdit) return;
    if (!custEdit.name.trim() || !custEdit.phone.trim()) {
      flash("Name and phone can't be empty.");
      return;
    }
    if (!phoneLooksValid(custEdit.phone)) {
      flash("Check the phone number — just the local number, e.g. 0813886676.");
      return;
    }
    const phone = displayPhone(custEdit.phone);
    setCustomers(cs => cs.map(c => c.id === custEdit.id ? {
      ...c,
      name: custEdit.name.trim(),
      phone,
      address: custEdit.address.trim()
    } : c));
    setOrders(os => os.map(o => o.customerId === custEdit.id ? {
      ...o,
      customerName: custEdit.name.trim(),
      phone
    } : o));
    setCustEdit(null);
    flash("Customer updated — their orders were updated too.");
  };
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [showCount, setShowCount] = useState(50);
  useEffect(() => {
    setShowCount(50);
  }, [filter, search]);
  const visibleOrders = orders.filter(o => {
    if (filter === "open" && (o.status === DONE_STATUS || o.cancelled)) return false;
    if (filter === "unpaid" && (payState(o) === "paid" || o.cancelled)) return false;
    if (filter === "done" && (o.status !== DONE_STATUS || o.cancelled)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || String(o.phone).includes(q);
  });
  const [period, setPeriod] = useState("7");
  const report = useMemo(() => {
    let start = 0;
    const now = Date.now();
    if (period === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      start = d.getTime();
    } else if (period === "7") start = now - 7 * 86400000;else if (period === "30") start = now - 30 * 86400000;
    const live = orders.filter(o => !o.cancelled);
    const pOrders = live.filter(o => (o.ts || 0) >= start);
    const collected = [];
    live.forEach(o => o.payments.forEach(p => {
      if ((p.ts || 0) >= start) collected.push(p);
    }));
    const revenue = collected.reduce((a, p) => a + p.amount, 0);
    const byMethod = {};
    collected.forEach(p => {
      byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
    });
    const items = {};
    pOrders.forEach(o => o.items.forEach(it => {
      const k = it.name;
      if (!items[k]) items[k] = {
        qty: 0,
        value: 0
      };
      items[k].qty += it.qty;
      items[k].value += (it.price || 0) * it.qty;
    }));
    const topItems = Object.entries(items).sort((a, b) => b[1].value - a[1].value).slice(0, 8);
    const outstanding = live.reduce((a, o) => a + balanceOf(o), 0);
    const orderValue = pOrders.reduce((a, o) => a + o.total, 0);
    const discounts = pOrders.reduce((a, o) => a + (o.discount || 0), 0);
    const readyDurs = [];
    pOrders.forEach(o => {
      const rec = (o.statusHistory || []).find(h => h.status === "Received");
      const rdy = (o.statusHistory || []).find(h => h.status === "Ready for collection");
      if (rec && rdy && rdy.ts > rec.ts) readyDurs.push(rdy.ts - rec.ts);
    });
    const avgReadyH = readyDurs.length ? readyDurs.reduce((a, b) => a + b, 0) / readyDurs.length / 3600000 : null;
    const collectedOrders = pOrders.filter(o => o.status === DONE_STATUS);
    const onTime = collectedOrders.filter(o => {
      const col = [...(o.statusHistory || [])].reverse().find(h => h.status === DONE_STATUS);
      return col && o.collectDate && localISO(new Date(col.ts)) <= o.collectDate;
    }).length;
    const custCounts = {};
    live.forEach(o => {
      custCounts[o.customerId] = (custCounts[o.customerId] || 0) + 1;
    });
    const repeat = pOrders.filter(o => custCounts[o.customerId] > 1).length;
    return {
      count: pOrders.length,
      revenue,
      orderValue,
      avg: pOrders.length ? orderValue / pOrders.length : 0,
      outstanding,
      discounts,
      byMethod: Object.entries(byMethod).sort((a, b) => b[1] - a[1]),
      topItems,
      express: pOrders.filter(o => o.express).length,
      cancelled: orders.filter(o => o.cancelled && (o.ts || 0) >= start).length,
      avgReadyH,
      onTimeRate: collectedOrders.length ? onTime / collectedOrders.length : null,
      collectedCount: collectedOrders.length,
      repeatRate: pOrders.length ? repeat / pOrders.length : null
    };
  }, [orders, period]);
  const openCount = orders.filter(o => o.status !== DONE_STATUS && !o.cancelled).length;
  const dash = useMemo(() => {
    const today = todayISO();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const st = d.getTime();
    const live = orders.filter(o => !o.cancelled);
    const receivedToday = live.filter(o => (o.ts || 0) >= st).length;
    const ready = live.filter(o => o.status === "Ready for collection");
    const dueToday = live.filter(o => o.status !== DONE_STATUS && o.collectDate === today);
    const overdue = live.filter(o => o.status !== DONE_STATUS && o.collectDate < today);
    const owing = live.filter(o => o.status === DONE_STATUS && balanceOf(o) > 0);
    let cashToday = 0;
    live.forEach(o => o.payments.forEach(p => {
      if ((p.ts || 0) >= st) cashToday += p.amount;
    }));
    const outstanding = live.reduce((a, o) => a + balanceOf(o), 0);
    const now = Date.now();
    const toMessage = ready.filter(o => !o.notifiedReadyTs).length + overdue.filter(o => !o.lastReminderTs || now - o.lastReminderTs > 24 * 3600000).length + owing.filter(o => !o.lastReminderTs || now - o.lastReminderTs > 3 * 24 * 3600000).length;
    return {
      receivedToday,
      ready,
      dueToday,
      overdue,
      owing,
      cashToday,
      outstanding,
      toMessage
    };
  }, [orders]);
  const jumpToOrder = id => {
    setTab("orders");
    setFilter("all");
    setSearch(id);
  };
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (!unlocked) return;
    lastActivity.current = Date.now();
    const bump = () => {
      lastActivity.current = Date.now();
    };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    const iv = setInterval(() => {
      if (Date.now() - lastActivity.current > 5 * 60000) {
        setUnlocked(false);
        setCurrentStaff("");
        setCurrentUserId(null);
      }
    }, 30000);
    return () => {
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
      clearInterval(iv);
    };
  }, [unlocked]);
  const chartDays = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        key: d.toDateString(),
        lbl: d.toLocaleDateString("en-GB", {
          day: "2-digit"
        }),
        amt: 0
      });
    }
    orders.filter(o => !o.cancelled).forEach(o => o.payments.forEach(p => {
      const k = new Date(p.ts).toDateString();
      const day = days.find(x => x.key === k);
      if (day) day.amt += p.amount;
    }));
    return days;
  }, [orders]);
  const chartTotal = chartDays.reduce((a, d) => a + d.amt, 0);
  if (!loaded) {
    return React.createElement("div", {
      className: "app loading-screen"
    }, React.createElement("style", null, CSS), React.createElement("div", {
      className: "loading-card"
    }, React.createElement("span", {
      className: "brand-drop"
    }, "💧"), React.createElement("div", null, "Loading Hint Laundry…")));
  }
  if (!unlocked) {
    const tryUnlock = async () => {
      let user = null;
      for (const u of users) {
        if (await pinMatches(pinInput, u)) {
          user = u;
          break;
        }
      }
      if (!user) {
        setPinError("PIN not recognised — try again.");
        setPinInput("");
        return;
      }
      setRole(user.role);
      setCurrentStaff(user.name);
      setCurrentUserId(user.id);
      setUnlocked(true);
      setPinError("");
      setPinInput("");
      setTab("dash");
      if (user.role === "admin") {
        if (settings.autoBackup !== false && Date.now() - lastBackupTs > 24 * 3600000) {
          setTimeout(() => backupData(true), 800);
        } else if (settings.autoBackup === false && Date.now() - lastBackupTs > 3 * 24 * 3600000) {
          setTimeout(() => flash("Reminder: no recent backup — tap “Backup now” in Settings when you have a moment."), 600);
        }
      }
    };
    return React.createElement("div", {
      className: "app"
    }, React.createElement("style", null, CSS), React.createElement("div", {
      className: "login-wrap"
    }, React.createElement("div", {
      className: "login-card"
    }, React.createElement("span", {
      className: "brand-drop big",
      "aria-hidden": "true"
    }, "💧"), React.createElement("h1", {
      className: "login-title"
    }, settings.shopName), React.createElement("p", {
      className: "muted center-text"
    }, "Enter your personal PIN to sign in"), React.createElement("div", {
      className: "pin-row"
    }, React.createElement("input", {
      type: "password",
      value: pinInput,
      inputMode: "numeric",
      maxLength: 6,
      placeholder: "••••",
      className: "pin-field",
      autoFocus: true,
      "aria-label": "Your personal PIN",
      onChange: e => {
        setPinInput(e.target.value.replace(/\D/g, ""));
        setPinError("");
      },
      onKeyDown: e => e.key === "Enter" && tryUnlock()
    }), React.createElement("button", {
      className: "btn-main",
      onClick: tryUnlock
    }, "Sign in")), pinError && React.createElement("p", {
      className: "pin-error"
    }, pinError), React.createElement("p", {
      className: "tiny"
    }, "Demo PINs — Owner: 1234 · Staff: 5678. The owner adds real staff in the Team tab."))));
  }
  const printOrder = printing ? orders.find(o => o.id === printing.orderId) : null;
  return React.createElement("div", {
    className: "app"
  }, React.createElement("style", null, CSS), printOrder && React.createElement(Modal, {
    label: printing.type === "slip" ? `Laundry slip ${printOrder.id}` : `Receipt for ${printOrder.id}`,
    onClose: () => setPrinting(null),
    overlayClassName: "print-overlay",
    className: "print-modal-body"
  }, React.createElement("div", {
    className: "print-doc" + (settings.printFormat === "thermal" ? " thermal" : "")
  }, printing.type === "slip" ? React.createElement(Slip, {
    o: printOrder,
    st: settings
  }) : React.createElement(Receipt, {
    o: printOrder,
    st: settings
  })), React.createElement("div", {
    className: "print-actions no-print"
  }, React.createElement("button", {
    className: "btn-main",
    onClick: () => window.print()
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, "🖨️"), " Print"), React.createElement("a", {
    className: "btn-wa",
    target: "_blank",
    rel: "noreferrer",
    href: waTo(printOrder.phone, printing.type === "slip" ? withTrack(slipText(printOrder, settings), printOrder) : receiptText(printOrder, settings))
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, "📲"), " Send on WhatsApp"), React.createElement("button", {
    className: "btn-ghost",
    onClick: () => setPrinting(null)
  }, "Close"))), confirmBox && React.createElement(Modal, {
    label: confirmBox.title,
    onClose: () => setConfirmBox(null),
    className: "edit-panel confirm-panel"
  }, React.createElement("h2", null, confirmBox.title), React.createElement("p", {
    className: "muted"
  }, confirmBox.body), confirmBox.requireText && React.createElement("input", {
    value: confirmText,
    placeholder: `Type ${confirmBox.requireText} to confirm`,
    autoFocus: true,
    onChange: e => setConfirmText(e.target.value)
  }), React.createElement("div", {
    className: "edit-actions"
  }, React.createElement("button", {
    className: "btn-main" + (confirmBox.danger ? " danger-bg" : ""),
    disabled: confirmBox.requireText ? confirmText.trim().toUpperCase() !== confirmBox.requireText : false,
    onClick: () => {
      const fn = confirmBox.onConfirm;
      setConfirmBox(null);
      fn();
    }
  }, confirmBox.confirmLabel), React.createElement("button", {
    className: "btn-ghost",
    onClick: () => setConfirmBox(null)
  }, "Go back"))), edit && React.createElement(Modal, {
    label: `Edit order ${edit.orderId}`,
    onClose: () => setEdit(null),
    className: "edit-panel"
  }, React.createElement("h2", null, "Edit ", edit.orderId), React.createElement("p", {
    className: "muted"
  }, "Fix quantities, add or remove items, adjust the discount or collection time."), edit.lines.map(l => React.createElement("div", {
    key: l.key,
    className: "svc-row"
  }, React.createElement("div", {
    className: "svc-info"
  }, React.createElement("div", null, l.name), React.createElement("span", null, fmt(l.price), " each")), React.createElement("div", {
    className: "qty"
  }, React.createElement("button", {
    onClick: () => editSetQty(l.key, l.qty - 1),
    "aria-label": `Remove one ${l.name}`
  }, "−"), React.createElement("span", null, l.qty), React.createElement("button", {
    onClick: () => editSetQty(l.key, l.qty + 1),
    "aria-label": `Add one ${l.name}`
  }, "+")))), React.createElement("div", {
    className: "edit-adders"
  }, React.createElement("div", {
    className: "edit-add"
  }, React.createElement("select", {
    value: edit.addId,
    "aria-label": "Add an item from the price list",
    onChange: e => setEdit({
      ...edit,
      addId: e.target.value
    })
  }, React.createElement("option", {
    value: ""
  }, "Add from price list…"), services.map(s => React.createElement("option", {
    key: s.id,
    value: s.id
  }, s.name, " — ", fmt(s.price)))), React.createElement("button", {
    className: "btn-ghost small",
    onClick: editAddService
  }, "Add")), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: edit.customDraft.name,
    placeholder: "Custom item name",
    "aria-label": "Custom item name",
    onChange: e => setEdit({
      ...edit,
      customDraft: {
        ...edit.customDraft,
        name: e.target.value
      }
    })
  }), React.createElement("input", {
    type: "number",
    min: "0",
    value: edit.customDraft.price,
    placeholder: "Price",
    "aria-label": "Custom item price",
    className: "narrow",
    onChange: e => setEdit({
      ...edit,
      customDraft: {
        ...edit.customDraft,
        price: e.target.value
      }
    })
  }), React.createElement("button", {
    className: "btn-ghost small",
    onClick: editAddCustom
  }, "Add"))), React.createElement("div", {
    className: "form two-col edit-fields"
  }, React.createElement("label", null, "Collection date", React.createElement("input", {
    type: "date",
    value: edit.collectDate,
    onChange: e => setEdit({
      ...edit,
      collectDate: e.target.value
    })
  })), React.createElement("label", null, "Collection time", React.createElement("select", {
    value: edit.collectSlot,
    onChange: e => setEdit({
      ...edit,
      collectSlot: e.target.value
    })
  }, !settings.slots.includes(edit.collectSlot) && React.createElement("option", {
    value: edit.collectSlot
  }, edit.collectSlot), settings.slots.map(s => React.createElement("option", {
    key: s
  }, s)))), React.createElement("label", null, "Discount (N$)", React.createElement("input", {
    type: "number",
    min: "0",
    value: edit.discount,
    placeholder: "0",
    onChange: e => setEdit({
      ...edit,
      discount: e.target.value
    })
  })), React.createElement("label", {
    className: "express-inline"
  }, React.createElement("input", {
    type: "checkbox",
    checked: edit.express,
    onChange: e => setEdit({
      ...edit,
      express: e.target.checked
    })
  }), "Express (+", settings.expressRate, "%)"), React.createElement("label", {
    className: "span2"
  }, "Notes", React.createElement("input", {
    value: edit.notes,
    onChange: e => setEdit({
      ...edit,
      notes: e.target.value
    })
  }))), React.createElement("div", {
    className: "edit-total"
  }, "Subtotal ", fmt(editSub), editFee > 0 ? ` · Express ${fmt(editFee)}` : "", editDisc > 0 ? ` · Discount −${fmt(editDisc)}` : "", " · ", React.createElement("b", null, "New total ", fmt(editTotal))), React.createElement("div", {
    className: "edit-actions"
  }, React.createElement("button", {
    className: "btn-main",
    onClick: saveEdit
  }, "Save changes"), React.createElement("button", {
    className: "btn-ghost",
    onClick: () => setEdit(null)
  }, "Discard"))), React.createElement("div", {
    className: "shell layout" + (printOrder || edit || confirmBox ? " shell-dim" : "")
  }, React.createElement("aside", {
    className: "sidebar no-print"
  }, React.createElement("div", {
    className: "sb-brand"
  }, React.createElement("span", {
    className: "sb-logo",
    "aria-hidden": "true"
  }, "💧"), React.createElement("div", null, React.createElement("b", null, settings.shopName.split("&")[0].trim()), React.createElement("span", null, "Laundry Management"))), React.createElement("nav", {
    className: "sb-nav"
  }, React.createElement("button", {
    className: tab === "dash" ? "on" : "",
    "aria-current": tab === "dash" ? "page" : undefined,
    onClick: () => setTab("dash")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "🏠"), " Dashboard"), React.createElement("button", {
    className: tab === "new" ? "on" : "",
    "aria-current": tab === "new" ? "page" : undefined,
    onClick: () => setTab("new")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "➕"), " New order"), React.createElement("button", {
    className: tab === "orders" ? "on" : "",
    "aria-current": tab === "orders" ? "page" : undefined,
    onClick: () => setTab("orders")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "🧺"), " Orders", openCount ? React.createElement("em", {
    className: "sb-badge"
  }, openCount) : null), React.createElement("button", {
    className: tab === "customers" ? "on" : "",
    "aria-current": tab === "customers" ? "page" : undefined,
    onClick: () => setTab("customers")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "👥"), " Customers"), isAdmin && React.createElement("button", {
    className: tab === "reports" ? "on" : "",
    "aria-current": tab === "reports" ? "page" : undefined,
    onClick: () => setTab("reports")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "📊"), " Reports"), isAdmin && React.createElement("button", {
    className: tab === "prices" ? "on" : "",
    "aria-current": tab === "prices" ? "page" : undefined,
    onClick: () => setTab("prices")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "🏷️"), " Price list"), isAdmin && React.createElement("button", {
    className: tab === "team" ? "on" : "",
    "aria-current": tab === "team" ? "page" : undefined,
    onClick: () => setTab("team")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "👤"), " Team"), isAdmin && React.createElement("button", {
    className: tab === "settings" ? "on" : "",
    "aria-current": tab === "settings" ? "page" : undefined,
    onClick: () => setTab("settings")
  }, React.createElement("i", {
    "aria-hidden": "true"
  }, "⚙️"), " Settings")), React.createElement("div", {
    className: "sb-foot"
  }, cloud && React.createElement("div", {
    className: "sync-chip sync-" + syncState,
    role: "status"
  }, syncState === "syncing" ? "☁ Syncing…" : syncState === "offline" ? "☁ Offline — will catch up" : syncState === "error" ? "☁ Sync problem — retrying" : "☁ Synced"), React.createElement("div", {
    className: "sb-user"
  }, React.createElement("span", {
    className: "sb-avatar"
  }, currentStaff.slice(0, 1).toUpperCase()), React.createElement("div", null, React.createElement("b", null, currentStaff), React.createElement("span", null, isAdmin ? "Owner" : "Staff"))), React.createElement("button", {
    className: "btn-lock",
    onClick: () => {
      setUnlocked(false);
      setCurrentStaff("");
    }
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, "🔒"), " Lock"))), React.createElement("div", {
    className: "main-col"
  }, React.createElement("div", {
    role: "status",
    "aria-live": "polite"
  }, toast && React.createElement("div", {
    className: "toast"
  }, toast)), React.createElement("main", {
    className: "wrap"
  }, React.createElement("div", {
    className: "page-head no-print"
  }, React.createElement("h1", null, PAGE_META[tab] ? PAGE_META[tab][0] : ""), React.createElement("p", null, PAGE_META[tab] ? PAGE_META[tab][1] : "")), isAdmin && defaultPinsActive && tab !== "team" && React.createElement("div", {
    className: "warn-banner no-print"
  }, "⚠️ The demo PINs (1234 / 5678) are still active — anyone who knows them can sign in.", React.createElement("button", {
    className: "ft-link",
    onClick: () => setTab("team")
  }, "Change them in the Team tab")), tab === "dash" && React.createElement("section", null, React.createElement("div", {
    className: "report-head no-print"
  }, React.createElement("div", {
    className: "chip-row"
  }), React.createElement("button", {
    className: "btn-main",
    onClick: () => setTab("new")
  }, "＋ New order")), React.createElement("div", {
    className: "stat-row"
  }, React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Collected today"), React.createElement("b", {
    className: "c-blue"
  }, fmt(dash.cashToday)), React.createElement("span", null, "payments received")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Orders today"), React.createElement("b", null, dash.receivedToday), React.createElement("span", null, "received at the counter")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Ready"), React.createElement("b", {
    className: "c-green"
  }, dash.ready.length), React.createElement("span", null, "waiting for collection")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Due today"), React.createElement("b", null, dash.dueToday.length), React.createElement("span", null, "collections booked")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Outstanding"), React.createElement("b", {
    className: "c-red"
  }, fmt(dash.outstanding)), React.createElement("span", null, "balances owed")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "To message"), React.createElement("b", {
    className: dash.toMessage > 0 ? "c-amber" : "c-green"
  }, dash.toMessage), React.createElement("span", null, "WhatsApps in the lists below"))), React.createElement("div", {
    className: "panel"
  }, React.createElement("div", {
    className: "panel-head"
  }, React.createElement("h2", null, "Collections — last 14 days"), React.createElement("span", {
    className: "panel-total"
  }, fmt(chartTotal))), React.createElement(BarChart, {
    data: chartDays
  })), React.createElement("div", {
    className: "report-grid"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("h2", null, "Overdue collections"), React.createElement("p", {
    className: "muted"
  }, "Past their collection date and still with us — worth a WhatsApp reminder."), dash.overdue.length === 0 && React.createElement("p", {
    className: "muted"
  }, "Nothing overdue. 🎉"), dash.overdue.map(o => React.createElement("div", {
    key: o.id,
    className: "dash-row"
  }, React.createElement("div", null, React.createElement("b", null, o.id), " · ", o.customerName, React.createElement("span", {
    className: "dash-sub"
  }, "was due ", o.collectDate, " · balance ", fmt(balanceOf(o)), o.lastReminderTs ? ` · reminded ${dateLabel(o.lastReminderTs)}` : "")), React.createElement("div", {
    className: "dash-acts"
  }, React.createElement("a", {
    className: "wa-mini",
    target: "_blank",
    rel: "noreferrer",
    href: waTo(o.phone, withTrack(overdueText(o, settings), o)),
    onClick: () => stampOrder(o.id, "lastReminderTs")
  }, "Send reminder"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => jumpToOrder(o.id)
  }, "Open"))))), React.createElement("div", {
    className: "panel"
  }, React.createElement("h2", null, "Ready — collect & pay"), React.createElement("p", {
    className: "muted"
  }, "Cleaned and waiting; balance is collected on pickup."), dash.ready.length === 0 && React.createElement("p", {
    className: "muted"
  }, "Nothing waiting for collection right now."), dash.ready.map(o => {
    const bal = balanceOf(o);
    return React.createElement("div", {
      key: o.id,
      className: "dash-row"
    }, React.createElement("div", null, React.createElement("b", null, o.id), " · ", o.customerName, React.createElement("span", {
      className: "dash-sub"
    }, bal > 0 ? `balance ${fmt(bal)}` : "fully paid", " · collection ", o.collectDate, o.notifiedReadyTs ? " · notified ✓" : "")), React.createElement("div", {
      className: "dash-acts"
    }, React.createElement("a", {
      className: "wa-mini",
      target: "_blank",
      rel: "noreferrer",
      href: waTo(o.phone, withTrack(readyText(o, settings), o)),
      onClick: () => stampOrder(o.id, "notifiedReadyTs")
    }, "Notify ready"), React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => jumpToOrder(o.id)
    }, "Open")));
  })), dash.owing.length > 0 && React.createElement("div", {
    className: "panel"
  }, React.createElement("h2", null, "Collected but still owing"), React.createElement("p", {
    className: "muted"
  }, "Items already released with a balance owing — follow up until it's settled."), dash.owing.map(o => React.createElement("div", {
    key: o.id,
    className: "dash-row"
  }, React.createElement("div", null, React.createElement("b", null, o.id), " · ", o.customerName, React.createElement("span", {
    className: "dash-sub"
  }, "owing ", fmt(balanceOf(o)), " · collected ", o.collectDate, o.lastReminderTs ? ` · reminded ${dateLabel(o.lastReminderTs)}` : "")), React.createElement("div", {
    className: "dash-acts"
  }, React.createElement("a", {
    className: "wa-mini",
    target: "_blank",
    rel: "noreferrer",
    href: waTo(o.phone, owingText(o, settings)),
    onClick: () => stampOrder(o.id, "lastReminderTs")
  }, "Send reminder"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => jumpToOrder(o.id)
  }, "Open"))))))), tab === "new" && React.createElement("section", {
    className: "order-grid"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("h2", null, "New order"), React.createElement("p", {
    className: "muted"
  }, "Register the customer (first visit only), count the items, take a deposit."), React.createElement("div", {
    className: "svc-cat"
  }, "Customer"), selectedCustomer ? React.createElement("div", {
    className: "cust-selected"
  }, React.createElement("div", null, React.createElement("b", null, selectedCustomer.name), React.createElement("span", {
    className: "dash-sub"
  }, selectedCustomer.phone, " · ", selectedCustomer.address)), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setSel({
      customerId: "",
      name: "",
      phone: "",
      address: "",
      newMode: false
    })
  }, "Change")) : sel.newMode ? React.createElement("div", {
    className: "form"
  }, React.createElement("div", {
    className: "new-cust-head"
  }, React.createElement("span", null, "Registering a new customer"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setSel({
      customerId: "",
      name: "",
      phone: "",
      address: "",
      newMode: false
    })
  }, "Back to search")), React.createElement("label", null, "Full name", React.createElement("input", {
    value: sel.name,
    onChange: e => setSel({
      ...sel,
      name: e.target.value
    }),
    placeholder: "Customer's name",
    autoFocus: true
  })), React.createElement("label", null, "Phone (WhatsApp)", React.createElement("div", {
    className: "phone-wrap"
  }, React.createElement("span", {
    className: "phone-cc"
  }, "+264"), React.createElement("input", {
    value: sel.phone,
    inputMode: "tel",
    onChange: e => setSel({
      ...sel,
      phone: e.target.value
    }),
    placeholder: "0813886676"
  }))), React.createElement("label", null, "Address (optional)", React.createElement("input", {
    value: sel.address,
    onChange: e => setSel({
      ...sel,
      address: e.target.value
    }),
    placeholder: "Erf / street, Oshikuku"
  }))) : React.createElement("div", {
    className: "cust-search"
  }, React.createElement("div", {
    className: "cust-combo"
  }, React.createElement("input", {
    value: custQuery,
    placeholder: "Select or search customer…",
    role: "combobox",
    "aria-expanded": custFocus || !!custQuery.trim(),
    "aria-controls": "cust-listbox",
    "aria-label": "Search customers by name or phone",
    "aria-autocomplete": "list",
    "aria-activedescendant": custHi >= 0 && custResults[custHi] ? `cust-opt-${custHi}` : undefined,
    onFocus: () => setCustFocus(true),
    onBlur: () => setTimeout(() => setCustFocus(false), 150),
    onChange: e => {
      setCustQuery(e.target.value);
      setCustFocus(true);
      setCustHi(-1);
    },
    onKeyDown: e => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCustFocus(true);
        setCustHi(h => Math.min(h + 1, custResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCustHi(h => Math.max(h - 1, 0));
      } else if (e.key === "Enter" && custHi >= 0 && custResults[custHi]) {
        e.preventDefault();
        pickCustomer(custResults[custHi]);
        setCustFocus(false);
        setCustHi(-1);
      } else if (e.key === "Escape") {
        setCustFocus(false);
        setCustHi(-1);
      }
    }
  }), React.createElement("span", {
    className: "combo-arrow",
    "aria-hidden": "true"
  }, "▾")), (custFocus || custQuery.trim()) && React.createElement("div", {
    className: "cust-results",
    id: "cust-listbox",
    role: "listbox",
    onMouseDown: e => e.preventDefault()
  }, custResults.map((c, i) => React.createElement("button", {
    key: c.id,
    id: `cust-opt-${i}`,
    role: "option",
    "aria-selected": i === custHi,
    className: "cust-result" + (i === custHi ? " hi" : ""),
    onClick: () => {
      pickCustomer(c);
      setCustFocus(false);
      setCustHi(-1);
    }
  }, React.createElement("b", null, c.name), React.createElement("span", null, c.phone))), custResults.length === 0 && React.createElement("div", {
    className: "cust-none"
  }, "No match found.")), React.createElement("button", {
    className: "btn-ghost new-cust-btn",
    onClick: startNewCustomer
  }, "＋ Register new customer")), React.createElement("div", {
    className: "svc-cat"
  }, "Items"), ["Garments", "Household"].map(cat => React.createElement("div", {
    key: cat,
    className: "svc-group"
  }, services.filter(s => s.cat === cat).map(s => React.createElement("div", {
    key: s.id,
    className: "svc-row"
  }, React.createElement("span", {
    className: "svc-icon"
  }, s.icon), React.createElement("div", {
    className: "svc-info"
  }, React.createElement("div", null, s.name), React.createElement("span", null, fmt(s.price), " ", s.unit)), React.createElement("div", {
    className: "qty"
  }, React.createElement("button", {
    onClick: () => setQty(s.id, (cart[s.id] || 0) - 1),
    "aria-label": `Remove one ${s.name}`
  }, "−"), React.createElement("span", null, cart[s.id] || 0), React.createElement("button", {
    onClick: () => setQty(s.id, (cart[s.id] || 0) + 1),
    "aria-label": `Add one ${s.name}`
  }, "+")))))), React.createElement("div", {
    className: "svc-cat"
  }, "Custom item (anything not on the list)"), customLines.map(l => React.createElement("div", {
    key: l.key,
    className: "svc-row"
  }, React.createElement("span", {
    className: "svc-icon"
  }, "✨"), React.createElement("div", {
    className: "svc-info"
  }, React.createElement("div", null, l.name), React.createElement("span", null, fmt(l.price), " each")), React.createElement("div", {
    className: "qty"
  }, React.createElement("button", {
    onClick: () => setCustomQty(l.key, l.qty - 1),
    "aria-label": `Remove one ${l.name}`
  }, "−"), React.createElement("span", null, l.qty), React.createElement("button", {
    onClick: () => setCustomQty(l.key, l.qty + 1),
    "aria-label": `Add one ${l.name}`
  }, "+")))), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: customDraft.name,
    placeholder: "e.g. Wedding gown",
    "aria-label": "Custom item name",
    onChange: e => setCustomDraft({
      ...customDraft,
      name: e.target.value
    })
  }), React.createElement("input", {
    type: "number",
    min: "0",
    value: customDraft.price,
    placeholder: "Price",
    "aria-label": "Custom item price",
    className: "narrow",
    onChange: e => setCustomDraft({
      ...customDraft,
      price: e.target.value
    })
  }), React.createElement("button", {
    className: "btn-ghost small",
    onClick: addCustom
  }, "Add")), React.createElement("label", {
    className: "express"
  }, React.createElement("input", {
    type: "checkbox",
    checked: express,
    onChange: e => setExpress(e.target.checked)
  }), React.createElement("div", null, React.createElement("div", null, "Express service (+", settings.expressRate, "%)"), React.createElement("span", null, "Back within 24 hours"))), React.createElement("h2", {
    className: "mt"
  }, "Collection & payment"), React.createElement("p", {
    className: "muted small-note"
  }, "Collection is set automatically: morning orders (07:30–12:00) → next day 13:00–14:00 · Saturday orders → Monday 14:00–15:00 · otherwise one full day later, same time. Adjust below if the customer prefers."), React.createElement("div", {
    className: "form two-col"
  }, React.createElement("label", null, "Collection date", React.createElement("input", {
    type: "date",
    min: todayISO(),
    value: collect.date,
    onChange: e => setCollect({
      ...collect,
      date: e.target.value
    })
  })), React.createElement("label", null, "Collection time", React.createElement("select", {
    value: collect.slot,
    onChange: e => setCollect({
      ...collect,
      slot: e.target.value
    })
  }, !settings.slots.includes(collect.slot) && React.createElement("option", {
    value: collect.slot
  }, collect.slot, " (auto)"), settings.slots.map(s => React.createElement("option", {
    key: s
  }, s)))), React.createElement("label", null, "Payment now (optional)", React.createElement("input", {
    type: "number",
    min: "0",
    value: payNow.amount,
    placeholder: "Amount received",
    onChange: e => setPayNow({
      ...payNow,
      amount: e.target.value
    })
  }), total > 0 && React.createElement("span", {
    className: "amt-chips"
  }, React.createElement("button", {
    type: "button",
    className: "amt-chip",
    onClick: () => setPayNow({
      ...payNow,
      amount: String(total)
    })
  }, "Full ", fmt(total)), React.createElement("button", {
    type: "button",
    className: "amt-chip",
    onClick: () => setPayNow({
      ...payNow,
      amount: String(Math.ceil(total / 2))
    })
  }, "Half ", fmt(Math.ceil(total / 2)))), parseFloat(payNow.amount) > total && React.createElement("span", {
    className: "overpay-note"
  }, "That's more than the total (", fmt(total), ") — is that right?")), React.createElement("label", null, "Payment method", React.createElement("select", {
    value: payNow.method,
    onChange: e => setPayNow({
      ...payNow,
      method: e.target.value
    })
  }, settings.payMethods.map(m => React.createElement("option", {
    key: m
  }, m)))), React.createElement("label", null, "Discount (N$, optional)", React.createElement("input", {
    type: "number",
    min: "0",
    value: discount,
    placeholder: "0",
    onChange: e => setDiscount(e.target.value)
  })), React.createElement("label", null, "Notes", React.createElement("input", {
    value: notes,
    placeholder: "Stains to watch, fabric care…",
    onChange: e => setNotes(e.target.value)
  })))), React.createElement("aside", {
    className: "ticket"
  }, React.createElement("div", {
    className: "ticket-hole"
  }), React.createElement("div", {
    className: "ticket-head"
  }, "ORDER TICKET"), cartLines.length === 0 ? React.createElement("div", {
    className: "ticket-empty"
  }, "No items yet.", React.createElement("br", null), "Count the customer's items in.") : React.createElement("div", {
    className: "ticket-lines"
  }, cartLines.map(l => React.createElement("div", {
    key: l.key
  }, React.createElement("span", null, l.qty, " × ", l.name), React.createElement("b", null, fmt(l.line)))), React.createElement("div", {
    className: "rule"
  }), React.createElement("div", null, React.createElement("span", null, "Subtotal"), React.createElement("b", null, fmt(subtotal))), express && React.createElement("div", null, React.createElement("span", null, "Express +", settings.expressRate, "%"), React.createElement("b", null, fmt(expressFee))), discountVal > 0 && React.createElement("div", null, React.createElement("span", null, "Discount"), React.createElement("b", null, "−", fmt(discountVal))), React.createElement("div", {
    className: "rule"
  }), React.createElement("div", {
    className: "ticket-total"
  }, React.createElement("span", null, "Total"), React.createElement("b", null, fmt(total)))), triedCreate && orderProblems().length > 0 && React.createElement("div", {
    className: "err-box",
    role: "alert"
  }, React.createElement("b", null, "Before creating this order:"), React.createElement("ul", null, orderProblems().map((p, i) => React.createElement("li", {
    key: i
  }, p)))), React.createElement("button", {
    className: "btn-main w-full",
    onClick: () => createOrder()
  }, "Create order & print slip"), (cartLines.length > 0 || express || discount || notes || payNow.amount) && React.createElement("button", {
    className: "btn-clear",
    onClick: clearTicket
  }, "✕ Clear order ticket"), React.createElement("div", {
    className: "ticket-serration"
  }))), tab === "orders" && React.createElement("section", null, React.createElement("div", {
    className: "order-toolbar no-print"
  }, React.createElement("input", {
    className: "search",
    value: search,
    "aria-label": "Search orders by name, phone or order number",
    placeholder: "Search name, phone or order no…",
    onChange: e => setSearch(e.target.value)
  }), React.createElement("div", {
    className: "chip-row"
  }, [["open", "Open"], ["unpaid", "Unpaid"], ["done", "Completed"], ["all", "All"]].map(([k, l]) => React.createElement("button", {
    key: k,
    className: "chip-btn" + (filter === k ? " on" : ""),
    "aria-pressed": filter === k,
    onClick: () => setFilter(k)
  }, l)))), visibleOrders.length === 0 && React.createElement("div", {
    className: "panel"
  }, React.createElement("p", {
    className: "muted"
  }, "No orders match.")), visibleOrders.slice(0, showCount).map(o => {
    const ps = payState(o);
    const draft = payDraft[o.id] || {
      amount: "",
      method: settings.payMethods[0]
    };
    const idx = STATUSES.indexOf(o.status);
    const isCancelling = cancelDraft && cancelDraft.orderId === o.id;
    return React.createElement("div", {
      key: o.id,
      className: "panel admin-order" + (o.cancelled ? " order-cancelled" : "")
    }, React.createElement("div", {
      className: "ao-head"
    }, React.createElement("div", null, React.createElement("b", null, o.id), " · ", o.customerName, " ", React.createElement("span", {
      className: "muted"
    }, "(", o.phone, ")"), o.express && React.createElement("span", {
      className: "chip express-chip"
    }, "EXPRESS"), o.cancelled && React.createElement("span", {
      className: "chip cancel-chip"
    }, "CANCELLED"), o.editedTs && !o.cancelled && React.createElement("span", {
      className: "chip edited-chip"
    }, "edited")), !o.cancelled && React.createElement("span", {
      className: `chip pay-${ps}`
    }, ps === "paid" ? "Paid" : ps === "partial" ? `Partial · ${fmt(paidOf(o))}/${fmt(o.total)}` : "Unpaid")), React.createElement("div", {
      className: "ao-meta"
    }, React.createElement("span", null, "Received ", label(o.ts), o.takenBy ? ` by ${o.takenBy}` : ""), React.createElement("span", null, "Collection ", o.collectDate, " · ", o.collectSlot), o.discount > 0 && React.createElement("span", null, "Discount ", fmt(o.discount)), o.notes && React.createElement("span", null, "“", o.notes, "”"), o.cancelled && React.createElement("span", {
      className: "cancel-note"
    }, "Cancelled by ", o.cancelled.by, ": “", o.cancelled.reason, "”")), React.createElement("div", {
      className: "ao-items"
    }, o.items.map((it, i) => React.createElement("span", {
      key: i
    }, it.qty, " × ", it.name)), React.createElement("b", null, fmt(o.total))), !o.cancelled && React.createElement(Cycle, {
      status: o.status
    }), !o.cancelled && !isCancelling && React.createElement("div", {
      className: "ao-actions"
    }, idx < STATUSES.length - 1 ? React.createElement("button", {
      className: "btn-main small",
      onClick: () => {
        const bal = balanceOf(o);
        if (STATUSES[idx + 1] === DONE_STATUS && bal > 0) {
          askConfirm({
            title: "Balance still owed",
            body: `${fmt(bal)} is still owed on ${o.id}. Record the payment below first, or release the items with the balance owing.`,
            confirmLabel: "Release with debt",
            danger: true,
            onConfirm: () => advanceStatus(o.id)
          });
        } else advanceStatus(o.id);
      }
    }, "Mark “", STATUSES[idx + 1], "”") : React.createElement("span", {
      className: "chip pay-paid"
    }, "Completed"), canStepBack(o) && React.createElement("button", {
      className: "btn-ghost small",
      title: "Undo the last status change",
      onClick: () => stepBackStatus(o.id)
    }, "↩ Step back"), React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setPrinting({
        type: "slip",
        orderId: o.id
      })
    }, React.createElement("span", {
      "aria-hidden": "true"
    }, "🧾"), " Slip"), o.payments.length > 0 && React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setPrinting({
        type: "receipt",
        orderId: o.id
      })
    }, React.createElement("span", {
      "aria-hidden": "true"
    }, "🧾"), " Receipt"), o.status === "Ready for collection" && React.createElement("a", {
      className: "wa-mini",
      target: "_blank",
      rel: "noreferrer",
      href: waTo(o.phone, withTrack(readyText(o, settings), o)),
      onClick: () => stampOrder(o.id, "notifiedReadyTs")
    }, "📣 Notify ready", o.notifiedReadyTs ? " ✓" : ""), o.status !== DONE_STATUS && React.createElement(React.Fragment, null, React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => openEdit(o)
    }, React.createElement("span", {
      "aria-hidden": "true"
    }, "✏️"), " Edit"), isAdmin && React.createElement("button", {
      className: "btn-ghost small danger",
      onClick: () => setCancelDraft({
        orderId: o.id,
        reason: ""
      })
    }, "Cancel order"))), isCancelling && React.createElement("div", {
      className: "cancel-form"
    }, React.createElement("input", {
      value: cancelDraft.reason,
      placeholder: "Reason for cancelling (required)",
      "aria-label": "Reason for cancelling",
      onChange: e => setCancelDraft({
        ...cancelDraft,
        reason: e.target.value
      })
    }), React.createElement("button", {
      className: "btn-main small danger-bg",
      onClick: confirmCancel
    }, "Confirm cancel"), React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setCancelDraft(null)
    }, "Keep order"), paidOf(o) > 0 && React.createElement("span", {
      className: "overpay-note"
    }, fmt(paidOf(o)), " has been paid on this order. If you refund it, also reverse the payment(s) so the books stay right — cancelled orders don't count in sales.")), !o.cancelled && ps !== "paid" && !isCancelling && React.createElement("div", {
      className: "pay-form"
    }, React.createElement("input", {
      type: "number",
      min: "0",
      placeholder: `Amount (due ${fmt(balanceOf(o))})`,
      "aria-label": `Payment amount for ${o.id}, due ${fmt(balanceOf(o))}`,
      value: draft.amount,
      onChange: e => setPayDraft(d => ({
        ...d,
        [o.id]: {
          ...draft,
          amount: e.target.value
        }
      }))
    }), React.createElement("button", {
      type: "button",
      className: "amt-chip",
      onClick: () => setPayDraft(d => ({
        ...d,
        [o.id]: {
          ...draft,
          amount: String(balanceOf(o))
        }
      }))
    }, "Full ", fmt(balanceOf(o))), React.createElement("select", {
      value: draft.method,
      "aria-label": "Payment method",
      onChange: e => setPayDraft(d => ({
        ...d,
        [o.id]: {
          ...draft,
          method: e.target.value
        }
      }))
    }, settings.payMethods.map(m => React.createElement("option", {
      key: m
    }, m))), React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => recordPayment(o.id)
    }, "Record payment & receipt"), parseFloat(draft.amount) > balanceOf(o) && React.createElement("span", {
      className: "overpay-note"
    }, "That's more than the balance (", fmt(balanceOf(o)), ") — is that right?")), o.payments.length > 0 && React.createElement("div", {
      className: "pay-log"
    }, o.payments.map((p, i) => React.createElement("span", {
      key: i,
      className: p.amount < 0 ? "pay-reversal" : p.reversed ? "pay-reversed" : ""
    }, fmt(p.amount), " · ", p.method, " · ", label(p.ts), p.by ? ` · ${p.by}` : "", p.amount > 0 && !p.reversed && !o.cancelled && isAdmin && React.createElement("button", {
      className: "reverse-btn",
      title: "Reverse this payment (correction)",
      onClick: () => reversePayment(o.id, i)
    }, "↩")))));
  }), visibleOrders.length > showCount && React.createElement("button", {
    className: "btn-ghost show-more",
    onClick: () => setShowCount(c => c + 50)
  }, "Show 50 more (", visibleOrders.length - showCount, " remaining)")), tab === "customers" && React.createElement("section", {
    className: "panel"
  }, React.createElement("h2", null, "Customers"), React.createElement("p", {
    className: "muted"
  }, "Register customers here or on the “+ New order” screen during their first visit. Use Edit to fix a wrong name or phone number."), React.createElement("div", {
    className: "svc-cat"
  }, "Add a customer"), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: custDraft.name,
    placeholder: "Full name",
    "aria-label": "Customer full name",
    onChange: e => setCustDraft({
      ...custDraft,
      name: e.target.value
    })
  }), React.createElement("input", {
    value: custDraft.phone,
    placeholder: "Phone, e.g. 0813886676",
    "aria-label": "Customer phone number",
    inputMode: "tel",
    className: "narrow",
    onChange: e => setCustDraft({
      ...custDraft,
      phone: e.target.value
    })
  }), React.createElement("input", {
    value: custDraft.address,
    placeholder: "Address (optional)",
    "aria-label": "Customer address (optional)",
    onChange: e => setCustDraft({
      ...custDraft,
      address: e.target.value
    })
  }), React.createElement("button", {
    className: "btn-main small",
    onClick: addCustomer
  }, "Add")), React.createElement("div", {
    className: "order-toolbar no-print"
  }, React.createElement("input", {
    className: "search",
    value: custTabQuery,
    "aria-label": "Search customers by name, phone or address",
    placeholder: "Search name, phone or address…",
    onChange: e => setCustTabQuery(e.target.value)
  }), custTabQuery && React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setCustTabQuery("")
  }, "Clear"), React.createElement("span", {
    className: "ft-note"
  }, filteredCustomers.length, " of ", customers.length)), React.createElement("table", {
    className: "table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "ID"), React.createElement("th", null, "Name"), React.createElement("th", null, "Phone"), React.createElement("th", null, "Address"), React.createElement("th", null, "Orders"), React.createElement("th", null, "Spent"), React.createElement("th", null))), React.createElement("tbody", null, filteredCustomers.length === 0 && React.createElement("tr", null, React.createElement("td", {
    colSpan: "7",
    className: "cust-none"
  }, "No customer matches “", custTabQuery, "”.")), filteredCustomers.map(c => {
    const cOrders = orders.filter(o => o.customerId === c.id && !o.cancelled);
    const spent = cOrders.reduce((a, o) => a + paidOf(o), 0);
    const editing = custEdit && custEdit.id === c.id;
    return editing ? React.createElement("tr", {
      key: c.id,
      className: "cust-edit-row"
    }, React.createElement("td", null, c.id), React.createElement("td", null, React.createElement("input", {
      value: custEdit.name,
      "aria-label": "Name",
      onChange: e => setCustEdit({
        ...custEdit,
        name: e.target.value
      })
    })), React.createElement("td", null, React.createElement("input", {
      value: custEdit.phone,
      "aria-label": "Phone",
      onChange: e => setCustEdit({
        ...custEdit,
        phone: e.target.value
      })
    })), React.createElement("td", null, React.createElement("input", {
      value: custEdit.address,
      "aria-label": "Address",
      onChange: e => setCustEdit({
        ...custEdit,
        address: e.target.value
      })
    })), React.createElement("td", {
      colSpan: "3"
    }, React.createElement("div", {
      className: "dash-acts"
    }, React.createElement("button", {
      className: "btn-main small",
      onClick: saveCustEdit
    }, "Save"), React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setCustEdit(null)
    }, "Discard")))) : React.createElement("tr", {
      key: c.id
    }, React.createElement("td", null, c.id), React.createElement("td", null, c.name), React.createElement("td", null, c.phone), React.createElement("td", null, c.address), React.createElement("td", null, cOrders.length), React.createElement("td", null, fmt(spent)), React.createElement("td", null, React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setCustEdit({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address
      })
    }, "✏️ Edit")));
  })))), tab === "reports" && isAdmin && React.createElement("section", null, React.createElement("div", {
    className: "report-head no-print"
  }, React.createElement("div", {
    className: "chip-row"
  }, [["today", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["all", "All time"]].map(([k, l]) => React.createElement("button", {
    key: k,
    className: "chip-btn" + (period === k ? " on" : ""),
    "aria-pressed": period === k,
    onClick: () => setPeriod(k)
  }, l)))), React.createElement("div", {
    className: "stat-row"
  }, React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Money collected"), React.createElement("b", {
    className: "c-blue"
  }, fmt(report.revenue)), React.createElement("span", null, "in this period")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Orders taken"), React.createElement("b", null, report.count), React.createElement("span", null, "excluding cancelled")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Average order"), React.createElement("b", null, fmt(report.avg)), React.createElement("span", null, "per order value")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Discounts"), React.createElement("b", {
    className: "c-amber"
  }, fmt(report.discounts)), React.createElement("span", null, "given in this period")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Outstanding"), React.createElement("b", {
    className: "c-red"
  }, fmt(report.outstanding)), React.createElement("span", null, "all-time balances"))), React.createElement("div", {
    className: "stat-row"
  }, React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Turnaround"), React.createElement("b", null, report.avgReadyH == null ? "—" : report.avgReadyH < 48 ? `${Math.round(report.avgReadyH)} h` : `${(report.avgReadyH / 24).toFixed(1)} d`), React.createElement("span", null, "received → ready, average")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Collected on time"), React.createElement("b", {
    className: report.onTimeRate != null && report.onTimeRate < 0.7 ? "c-amber" : "c-green"
  }, report.onTimeRate == null ? "—" : Math.round(report.onTimeRate * 100) + "%"), React.createElement("span", null, "of ", report.collectedCount, " collected order", report.collectedCount === 1 ? "" : "s")), React.createElement("div", {
    className: "stat"
  }, React.createElement("span", {
    className: "stat-lbl"
  }, "Repeat customers"), React.createElement("b", null, report.repeatRate == null ? "—" : Math.round(report.repeatRate * 100) + "%"), React.createElement("span", null, "orders from returning customers"))), React.createElement("div", {
    className: "report-grid"
  }, React.createElement("div", {
    className: "panel"
  }, React.createElement("h2", null, "Payments by method"), report.byMethod.length === 0 && React.createElement("p", {
    className: "muted"
  }, "No payments in this period."), React.createElement("table", {
    className: "table"
  }, React.createElement("tbody", null, report.byMethod.map(([m, v]) => React.createElement("tr", {
    key: m
  }, React.createElement("td", null, m), React.createElement("td", {
    className: "num"
  }, fmt(v)), React.createElement("td", {
    className: "bar-cell"
  }, React.createElement("div", {
    className: "bar",
    style: {
      width: Math.max(4, Math.round(v / (report.revenue || 1) * 100)) + "%"
    }
  })))))), report.cancelled > 0 && React.createElement("p", {
    className: "tiny left"
  }, report.cancelled, " cancelled order", report.cancelled > 1 ? "s" : "", " in this period — cancelled orders and their payments are excluded from these figures.")), React.createElement("div", {
    className: "panel"
  }, React.createElement("h2", null, "Top items"), report.topItems.length === 0 && React.createElement("p", {
    className: "muted"
  }, "No orders in this period."), React.createElement("table", {
    className: "table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Item"), React.createElement("th", {
    className: "num"
  }, "Qty"), React.createElement("th", {
    className: "num"
  }, "Value"))), React.createElement("tbody", null, report.topItems.map(([name, d]) => React.createElement("tr", {
    key: name
  }, React.createElement("td", null, name), React.createElement("td", {
    className: "num"
  }, d.qty), React.createElement("td", {
    className: "num"
  }, fmt(d.value)))))), report.express > 0 && React.createElement("p", {
    className: "tiny left"
  }, report.express, " express order", report.express > 1 ? "s" : "", " in this period.")))), tab === "prices" && isAdmin && React.createElement("section", {
    className: "panel"
  }, React.createElement("h2", null, "Price list"), React.createElement("p", {
    className: "muted"
  }, "Type the new amount — it saves automatically and applies to new orders. Existing slips keep the price the customer was charged."), React.createElement("div", {
    className: "edit-add",
    style: {
      marginBottom: 14
    }
  }, React.createElement("button", {
    className: "btn-main small",
    onClick: () => priceFileInput.current && priceFileInput.current.click()
  }, "⬆ Import price list (Excel)"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: exportPriceList
  }, "⬇ Download as Excel"), React.createElement("input", {
    type: "file",
    ref: priceFileInput,
    accept: ".xlsx,.xls,.csv",
    style: {
      display: "none"
    },
    onChange: e => {
      const f = e.target.files && e.target.files[0];
      if (f) parsePriceFile(f);
      e.target.value = "";
    }
  })), React.createElement("p", {
    className: "muted",
    style: {
      marginTop: -6
    }
  }, "Excel columns: ", React.createElement("strong", null, "Service Code · Item · Unit · Price (N$)"), " (Category optional). Items are matched by code or name — matches update the price, new ones are added. Tip: download the current list first and use it as your template."), importPreview && React.createElement("div", {
    style: {
      background: "#F0F6FF",
      border: "1px solid #BFDBFE",
      borderRadius: 10,
      padding: 14,
      marginBottom: 16
    }
  }, React.createElement("strong", null, "Import preview — ", importPreview.fileName), React.createElement("p", {
    className: "muted",
    style: {
      margin: "6px 0 10px"
    }
  }, importPreview.updated, " item(s) will be updated, ", importPreview.added, " new item(s) added", importPreview.skipped ? `, ${importPreview.skipped} row(s) skipped (missing name or price)` : "", ". Nothing changes until you press Apply."), React.createElement("table", {
    className: "table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Code"), React.createElement("th", null, "Item"), React.createElement("th", null, "Unit"), React.createElement("th", null, "Price (N$)"), React.createElement("th", null, "Action"))), React.createElement("tbody", null, importPreview.rows.map((r, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", null, r.code || "—"), React.createElement("td", null, r.name), React.createElement("td", null, r.unit), React.createElement("td", null, r.price), React.createElement("td", null, React.createElement("span", {
    className: "chip " + (r.action === "add" ? "role-admin" : "role-staff")
  }, r.action === "add" ? "New" : "Update")))))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginTop: 12
    }
  }, React.createElement("button", {
    className: "btn-main small",
    onClick: applyImport
  }, "Apply import"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setImportPreview(null)
  }, "Cancel"))), React.createElement("table", {
    className: "table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Item"), React.createElement("th", null, "Unit"), React.createElement("th", null, "Price (N$)"), React.createElement("th", null))), React.createElement("tbody", null, services.map(s => React.createElement("tr", {
    key: s.id
  }, React.createElement("td", null, s.icon, " ", s.name), React.createElement("td", null, s.unit), React.createElement("td", null, React.createElement("input", {
    type: "number",
    min: "0",
    step: "1",
    className: "price-input",
    value: s.price,
    "aria-label": `Price for ${s.name}`,
    onChange: e => {
      const v = parseFloat(e.target.value);
      setServices(sv => sv.map(x => x.id === s.id ? {
        ...x,
        price: isNaN(v) ? 0 : v
      } : x));
    }
  })), React.createElement("td", null, React.createElement("button", {
    className: "btn-ghost small danger",
    onClick: () => removeService(s.id)
  }, "Remove")))))), React.createElement("div", {
    className: "svc-cat"
  }, "Add an item"), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: svcDraft.name,
    placeholder: "Item name, e.g. School uniform",
    "aria-label": "New item name",
    onChange: e => setSvcDraft({
      ...svcDraft,
      name: e.target.value
    })
  }), React.createElement("input", {
    type: "number",
    min: "0",
    value: svcDraft.price,
    placeholder: "Price",
    "aria-label": "New item price",
    className: "narrow",
    onChange: e => setSvcDraft({
      ...svcDraft,
      price: e.target.value
    })
  }), React.createElement("select", {
    value: svcDraft.unit,
    "aria-label": "Unit",
    className: "narrow",
    onChange: e => setSvcDraft({
      ...svcDraft,
      unit: e.target.value
    })
  }, React.createElement("option", null, "per item"), React.createElement("option", null, "per pair"), React.createElement("option", null, "per kg")), React.createElement("select", {
    value: svcDraft.cat,
    "aria-label": "Category",
    className: "narrow",
    onChange: e => setSvcDraft({
      ...svcDraft,
      cat: e.target.value
    })
  }, React.createElement("option", null, "Garments"), React.createElement("option", null, "Household")), React.createElement("button", {
    className: "btn-main small",
    onClick: addService
  }, "Add"))), tab === "team" && isAdmin && React.createElement("section", {
    className: "panel"
  }, React.createElement("h2", null, "Team & PINs"), React.createElement("p", {
    className: "muted"
  }, "Each person signs in with their own PIN, and everything they do is recorded under their name. Staff PINs give daily-operations access; Owner PINs unlock everything."), defaultPinsActive && React.createElement("div", {
    className: "warn-banner"
  }, "⚠️ The demo PINs (1234 / 5678) are still active. Use ✏️ Edit to give each person their own secret PIN before staff start using the app."), React.createElement("table", {
    className: "table"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Name"), React.createElement("th", null, "Role"), React.createElement("th", null, "PIN"), React.createElement("th", null))), React.createElement("tbody", null, users.map(u => {
    const editing = userEdit && userEdit.id === u.id;
    return editing ? React.createElement("tr", {
      key: u.id,
      className: "cust-edit-row"
    }, React.createElement("td", null, React.createElement("input", {
      value: userEdit.name,
      "aria-label": "Name",
      onChange: e => setUserEdit({
        ...userEdit,
        name: e.target.value
      })
    })), React.createElement("td", null, React.createElement("span", {
      className: "chip " + (u.role === "admin" ? "role-admin" : "role-staff")
    }, u.role === "admin" ? "Owner" : "Staff")), React.createElement("td", null, React.createElement("input", {
      value: userEdit.pin,
      inputMode: "numeric",
      maxLength: 6,
      placeholder: "New PIN",
      "aria-label": "New PIN, 4 to 6 digits — leave blank to keep the current one",
      className: "pin-cell",
      onChange: e => setUserEdit({
        ...userEdit,
        pin: e.target.value.replace(/\D/g, "")
      })
    })), React.createElement("td", null, React.createElement("div", {
      className: "dash-acts"
    }, React.createElement("button", {
      className: "btn-main small",
      onClick: saveUserEdit
    }, "Save"), React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setUserEdit(null)
    }, "Discard")))) : React.createElement("tr", {
      key: u.id
    }, React.createElement("td", null, u.name, u.id === currentUserId ? " (you)" : ""), React.createElement("td", null, React.createElement("span", {
      className: "chip " + (u.role === "admin" ? "role-admin" : "role-staff")
    }, u.role === "admin" ? "Owner" : "Staff")), React.createElement("td", {
      className: "pin-cell"
    }, "••••"), React.createElement("td", null, React.createElement("div", {
      className: "dash-acts"
    }, React.createElement("button", {
      className: "btn-ghost small",
      onClick: () => setUserEdit({
        id: u.id,
        name: u.name,
        pin: ""
      })
    }, "✏️ Edit"), React.createElement("button", {
      className: "btn-ghost small danger",
      onClick: () => removeUser(u.id),
      disabled: u.id === currentUserId
    }, "Remove"))));
  }))), React.createElement("div", {
    className: "svc-cat"
  }, "Add a person"), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: userDraft.name,
    placeholder: "Name",
    "aria-label": "Person's name",
    onChange: e => setUserDraft({
      ...userDraft,
      name: e.target.value
    })
  }), React.createElement("input", {
    value: userDraft.pin,
    placeholder: "PIN (4–6 digits)",
    "aria-label": "PIN, 4 to 6 digits",
    inputMode: "numeric",
    maxLength: 6,
    className: "narrow",
    onChange: e => setUserDraft({
      ...userDraft,
      pin: e.target.value.replace(/\D/g, "")
    })
  }), React.createElement("select", {
    value: userDraft.role,
    "aria-label": "Role",
    className: "narrow",
    onChange: e => setUserDraft({
      ...userDraft,
      role: e.target.value
    })
  }, React.createElement("option", {
    value: "staff"
  }, "Staff"), React.createElement("option", {
    value: "admin"
  }, "Owner")), React.createElement("button", {
    className: "btn-main small",
    onClick: addUser
  }, "Add")), React.createElement("p", {
    className: "tiny left"
  }, "Tip: use ✏️ Edit to change a name or PIN (leave the PIN box blank to keep the current one). PINs are stored securely — nobody can read them back, so if one is forgotten just set a new one. Every PIN must be unique.")), tab === "settings" && isAdmin && React.createElement("section", {
    className: "panel"
  }, React.createElement("h2", null, "Settings"), React.createElement("p", {
    className: "muted"
  }, "Changes save automatically and update everywhere — slips, receipts, and WhatsApp messages."), React.createElement("div", {
    className: "svc-cat"
  }, "Company details"), React.createElement("div", {
    className: "form two-col"
  }, React.createElement("label", null, "Business name", React.createElement("input", {
    value: settings.shopName,
    onChange: e => setSettings({
      ...settings,
      shopName: e.target.value
    })
  })), React.createElement("label", null, "Business phone (shown on slips)", React.createElement("input", {
    value: settings.phone,
    onChange: e => setSettings({
      ...settings,
      phone: e.target.value
    })
  })), React.createElement("label", null, "Location", React.createElement("input", {
    value: settings.location,
    onChange: e => setSettings({
      ...settings,
      location: e.target.value
    })
  })), React.createElement("label", null, "Opening hours", React.createElement("input", {
    value: settings.hours,
    onChange: e => setSettings({
      ...settings,
      hours: e.target.value
    })
  }))), React.createElement("div", {
    className: "svc-cat"
  }, "Business rules"), React.createElement("div", {
    className: "form two-col"
  }, React.createElement("label", null, "Express surcharge (%)", React.createElement("input", {
    type: "number",
    min: "0",
    max: "200",
    value: settings.expressRate,
    onChange: e => {
      const v = parseFloat(e.target.value);
      setSettings({
        ...settings,
        expressRate: isNaN(v) ? 0 : v
      });
    }
  })), React.createElement("label", null, "Collection default (days after drop-off)", React.createElement("input", {
    type: "number",
    min: "0",
    max: "14",
    value: settings.turnaroundDays,
    onChange: e => {
      const v = parseInt(e.target.value, 10);
      setSettings({
        ...settings,
        turnaroundDays: isNaN(v) ? 1 : v
      });
    }
  })), React.createElement("label", null, "Uncollected items policy (days, shown on slip)", React.createElement("input", {
    type: "number",
    min: "1",
    max: "365",
    value: settings.policyDays,
    onChange: e => {
      const v = parseInt(e.target.value, 10);
      setSettings({
        ...settings,
        policyDays: isNaN(v) ? 30 : v
      });
    }
  })), React.createElement("label", null, "Print format for slips & receipts", React.createElement("select", {
    value: settings.printFormat,
    onChange: e => setSettings({
      ...settings,
      printFormat: e.target.value
    })
  }, React.createElement("option", {
    value: "a4"
  }, "A4 paper (normal printer)"), React.createElement("option", {
    value: "thermal"
  }, "80mm thermal (till receipt printer)"))), React.createElement("label", {
    className: "express-inline span2"
  }, React.createElement("input", {
    type: "checkbox",
    checked: settings.autoBackup !== false,
    onChange: e => setSettings({
      ...settings,
      autoBackup: e.target.checked
    })
  }), "Download a backup file automatically when the owner signs in (once a day)")), React.createElement("div", {
    className: "svc-cat"
  }, "Cloud sync — share records between devices"), !cloud ? React.createElement(React.Fragment, null, React.createElement("p", {
    className: "muted small-note"
  }, "Right now this device keeps its own records. Turn on cloud sync to store everything in your online database as well — then every connected phone or computer sees the same customers, orders and payments. The app still works offline and catches up when internet returns."), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("button", {
    className: "btn-main small",
    onClick: enableCloud
  }, "☁ Turn on cloud sync")), React.createElement("p", {
    className: "muted small-note"
  }, "Already turned on from another device? Paste that device's link code here instead:"), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: joinCode,
    placeholder: "Link code from the other device",
    "aria-label": "Link code from the other device",
    onChange: e => setJoinCode(e.target.value)
  }), React.createElement("button", {
    className: "btn-ghost small",
    onClick: joinCloud
  }, "Connect"))) : React.createElement(React.Fragment, null, React.createElement("p", {
    className: "muted small-note"
  }, syncState === "syncing" ? "Syncing…" : syncState === "offline" ? "Offline — changes are saved here and will sync when internet returns." : syncState === "error" ? "The last sync attempt failed — it will retry automatically." : cloud.lastSyncTs ? `Synced ${label(cloud.lastSyncTs)}.` : "Connected."), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => doSync()
  }, "Sync now"), React.createElement("button", {
    className: "btn-ghost small",
    onClick: copyLinkCode
  }, "Copy link code (to add a device)"), React.createElement("button", {
    className: "btn-ghost small danger",
    onClick: disconnectCloud
  }, "Disconnect this device")), React.createElement("p", {
    className: "tiny left"
  }, "To add a device: open the app there → Settings → paste the link code → Connect. Treat the code like a key — anyone who has it can read the shop's records."), React.createElement("p", {
    className: "tiny left link-code",
    "aria-label": "Your link code"
  }, linkCode)), React.createElement("div", {
    className: "svc-cat"
  }, "Payment methods"), React.createElement("div", {
    className: "setting-list"
  }, settings.payMethods.map(m => React.createElement("span", {
    key: m,
    className: "setting-item"
  }, m, settings.payMethods.length > 1 && React.createElement("button", {
    className: "item-x",
    "aria-label": `Remove ${m}`,
    onClick: () => setSettings({
      ...settings,
      payMethods: settings.payMethods.filter(x => x !== m)
    })
  }, "✕")))), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: newMethod,
    placeholder: "e.g. EasyWallet",
    "aria-label": "New payment method",
    onChange: e => setNewMethod(e.target.value)
  }), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => {
      const m = newMethod.trim();
      if (!m) return;
      if (settings.payMethods.some(x => x.toLowerCase() === m.toLowerCase())) {
        flash("That method is already listed.");
        return;
      }
      setSettings({
        ...settings,
        payMethods: [...settings.payMethods, m]
      });
      setNewMethod("");
    }
  }, "Add")), React.createElement("div", {
    className: "svc-cat"
  }, "Collection time slots"), React.createElement("div", {
    className: "setting-list"
  }, settings.slots.map(s => React.createElement("span", {
    key: s,
    className: "setting-item"
  }, s, settings.slots.length > 1 && React.createElement("button", {
    className: "item-x",
    "aria-label": `Remove ${s}`,
    onClick: () => setSettings({
      ...settings,
      slots: settings.slots.filter(x => x !== s)
    })
  }, "✕")))), React.createElement("div", {
    className: "edit-add"
  }, React.createElement("input", {
    value: newSlot,
    placeholder: "e.g. 09:00 – 12:00 (Sunday)",
    "aria-label": "New collection time slot",
    onChange: e => setNewSlot(e.target.value)
  }), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => {
      const s = newSlot.trim();
      if (!s) return;
      if (settings.slots.includes(s)) {
        flash("That slot is already listed.");
        return;
      }
      setSettings({
        ...settings,
        slots: [...settings.slots, s]
      });
      setNewSlot("");
    }
  }, "Add")), React.createElement("div", {
    className: "svc-cat"
  }, "WhatsApp message · “Ready for collection”"), React.createElement("p", {
    className: "muted small-note"
  }, "Placeholders the app fills in automatically: ", React.createElement("code", null, "{name}"), " customer's name · ", React.createElement("code", null, "{order}"), " order number · ", React.createElement("code", null, "{shop}"), " business name · ", React.createElement("code", null, "{balance}"), " balance due · ", React.createElement("code", null, "{hours}"), " opening hours · ", React.createElement("code", null, "{date}"), " collection date."), React.createElement("textarea", {
    className: "msg-area",
    rows: 4,
    value: settings.readyMsg,
    "aria-label": "Ready-for-collection message template",
    onChange: e => setSettings({
      ...settings,
      readyMsg: e.target.value
    })
  }), React.createElement("div", {
    className: "msg-preview"
  }, React.createElement("b", null, "Preview:"), " ", readyText(previewOrder, settings)), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setSettings({
      ...settings,
      readyMsg: DEFAULT_SETTINGS.readyMsg
    })
  }, "Restore default message"), React.createElement("div", {
    className: "svc-cat"
  }, "WhatsApp message · Overdue collection reminder"), React.createElement("textarea", {
    className: "msg-area",
    rows: 4,
    value: settings.overdueMsg,
    "aria-label": "Overdue reminder message template",
    onChange: e => setSettings({
      ...settings,
      overdueMsg: e.target.value
    })
  }), React.createElement("div", {
    className: "msg-preview"
  }, React.createElement("b", null, "Preview:"), " ", overdueText(previewOrder, settings)), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setSettings({
      ...settings,
      overdueMsg: DEFAULT_SETTINGS.overdueMsg
    })
  }, "Restore default message"), React.createElement("div", {
    className: "svc-cat"
  }, "WhatsApp message · Payment thank-you (opens the receipt message)"), React.createElement("textarea", {
    className: "msg-area",
    rows: 3,
    value: settings.thanksMsg,
    "aria-label": "Payment thank-you message template",
    onChange: e => setSettings({
      ...settings,
      thanksMsg: e.target.value
    })
  }), React.createElement("div", {
    className: "msg-preview"
  }, React.createElement("b", null, "Preview:"), " ", fillTpl(settings.thanksMsg, previewOrder, settings)), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setSettings({
      ...settings,
      thanksMsg: DEFAULT_SETTINGS.thanksMsg
    })
  }, "Restore default message"), React.createElement("div", {
    className: "svc-cat"
  }, "Slip footer note (use ", "{days}", " for the policy days)"), React.createElement("textarea", {
    className: "msg-area",
    rows: 3,
    value: settings.slipFooter,
    "aria-label": "Slip footer note",
    onChange: e => setSettings({
      ...settings,
      slipFooter: e.target.value
    })
  }), React.createElement("button", {
    className: "btn-ghost small",
    onClick: () => setSettings({
      ...settings,
      slipFooter: DEFAULT_SETTINGS.slipFooter
    })
  }, "Restore default note"))), React.createElement("footer", {
    className: "ft no-print"
  }, settings.shopName, " · Data saves automatically on this device.", isAdmin && React.createElement("span", {
    className: "ft-actions"
  }, React.createElement("span", {
    className: "ft-note"
  }, "Last backup: ", lastBackupTs ? label(lastBackupTs) : "never"), React.createElement("button", {
    className: "ft-link",
    onClick: () => backupData(false)
  }, "⬇ Backup now"), React.createElement("button", {
    className: "ft-link",
    onClick: () => restoreInput.current && restoreInput.current.click()
  }, "⬆ Restore"), React.createElement("input", {
    ref: restoreInput,
    type: "file",
    accept: ".json,application/json",
    className: "hidden-input",
    onChange: e => {
      if (e.target.files[0]) restoreData(e.target.files[0]);
      e.target.value = "";
    }
  }), React.createElement("button", {
    className: "reset-link",
    onClick: resetAllData
  }, "Reset all data"))))));
}
function Modal({
  label,
  onClose,
  className,
  overlayClassName = "print-overlay no-print",
  children
}) {
  const ref = useRef(null);
  useEffect(() => {
    const panel = ref.current;
    const opener = document.activeElement;
    const focusables = () => Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.disabled && el.offsetParent !== null);
    const first = focusables()[0];
    (first || panel).focus();
    const onKey = e => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const firstEl = f[0],
        lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (opener && opener.focus) opener.focus();
    };
  }, []);
  return React.createElement("div", {
    className: overlayClassName,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": label
  }, React.createElement("div", {
    className: className,
    ref: ref,
    tabIndex: -1
  }, children));
}
const PAGE_META = {
  dash: ["Dashboard", "Overview of today's laundry operations"],
  new: ["New order", "Register the customer, count the items, take a deposit"],
  orders: ["Orders", "Track progress, record payments, print slips and receipts"],
  customers: ["Customers", "Everyone registered at the counter"],
  reports: ["Reports", "Money collected, top items and payment methods"],
  prices: ["Price list", "Your services and prices — changes apply to new orders"],
  team: ["Team", "People and their sign-in PINs"],
  settings: ["Settings", "Company details, business rules and message templates"]
};
function BarChart({
  data
}) {
  const max = Math.max(...data.map(d => d.amt), 1);
  const w = 640,
    h = 170,
    pad = 5;
  const bw = w / data.length;
  return React.createElement("svg", {
    viewBox: `0 0 ${w} ${h + 26}`,
    className: "chart",
    role: "img",
    "aria-label": "Daily collections bar chart"
  }, data.map((d, i) => {
    const bh = Math.max(d.amt / max * (h - 14), 3);
    return React.createElement("g", {
      key: i
    }, React.createElement("rect", {
      x: i * bw + pad,
      y: h - bh,
      width: bw - pad * 2,
      height: bh,
      rx: "5",
      className: d.amt > 0 ? "bar-on" : "bar-off"
    }, React.createElement("title", null, d.lbl, ": ", fmt(d.amt))), React.createElement("text", {
      x: i * bw + bw / 2,
      y: h + 18,
      textAnchor: "middle",
      className: "bar-lbl"
    }, d.lbl));
  }));
}
function Cycle({
  status
}) {
  const idx = STATUSES.indexOf(status);
  return React.createElement("div", {
    className: "cycle"
  }, STATUSES.map((s, i) => React.createElement("div", {
    key: s,
    className: "cy-step" + (i < idx ? " done" : i === idx ? " now" : "")
  }, React.createElement("span", {
    className: "cy-dot"
  }), React.createElement("span", {
    className: "cy-label"
  }, s))));
}
function Slip({
  o,
  st
}) {
  const paid = paidOf(o);
  const balance = balanceOf(o);
  const tagBase = o.id.replace(/\D/g, "");
  const pieces = [];
  o.items.forEach(it => {
    for (let i = 0; i < it.qty; i++) pieces.push(it.name);
  });
  return React.createElement("div", {
    className: "doc"
  }, React.createElement("div", {
    className: "doc-head"
  }, React.createElement("div", {
    className: "doc-shop"
  }, st.shopName), React.createElement("div", {
    className: "doc-line"
  }, shopLine(st))), React.createElement("div", {
    className: "doc-title"
  }, "LAUNDRY SLIP"), React.createElement("div", {
    className: "doc-meta"
  }, React.createElement("div", null, React.createElement("span", null, "Order no."), React.createElement("b", null, o.id)), React.createElement("div", null, React.createElement("span", null, "Date"), React.createElement("b", null, label(o.ts))), React.createElement("div", null, React.createElement("span", null, "Served by"), React.createElement("b", null, o.takenBy || "-")), React.createElement("div", null, React.createElement("span", null, "Customer"), React.createElement("b", null, o.customerName)), React.createElement("div", null, React.createElement("span", null, "Phone"), React.createElement("b", null, o.phone)), React.createElement("div", null, React.createElement("span", null, "Collection"), React.createElement("b", null, o.collectDate, " · ", o.collectSlot)), o.express && React.createElement("div", null, React.createElement("span", null, "Service"), React.createElement("b", null, "EXPRESS (24h)"))), React.createElement("table", {
    className: "doc-items"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Item"), React.createElement("th", null, "Qty"), React.createElement("th", null, "Price"), React.createElement("th", null, "Amount"))), React.createElement("tbody", null, o.items.map((it, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", null, it.name), React.createElement("td", null, it.qty), React.createElement("td", null, fmt(it.price)), React.createElement("td", null, fmt(it.price * it.qty)))))), React.createElement("div", {
    className: "doc-totals"
  }, React.createElement("div", null, React.createElement("span", null, "Subtotal"), React.createElement("b", null, fmt(o.subtotal))), o.expressFee > 0 && React.createElement("div", null, React.createElement("span", null, "Express service"), React.createElement("b", null, fmt(o.expressFee))), o.discount > 0 && React.createElement("div", null, React.createElement("span", null, "Discount"), React.createElement("b", null, "−", fmt(o.discount))), React.createElement("div", {
    className: "doc-grand"
  }, React.createElement("span", null, "TOTAL"), React.createElement("b", null, fmt(o.total))), React.createElement("div", null, React.createElement("span", null, "Paid"), React.createElement("b", null, fmt(paid))), React.createElement("div", null, React.createElement("span", null, "Balance"), React.createElement("b", null, fmt(balance)))), React.createElement("div", {
    className: "doc-tags"
  }, React.createElement("div", {
    className: "doc-tags-title"
  }, "GARMENT TAGS · ", pieces.length, " piece", pieces.length !== 1 ? "s" : ""), pieces.map((name, i) => React.createElement("div", {
    key: i,
    className: "doc-tag"
  }, React.createElement("b", null, tagBase, "-", i + 1), " ", name))), o.notes && React.createElement("div", {
    className: "doc-notes"
  }, "Note: ", o.notes), React.createElement("div", {
    className: "doc-foot"
  }, st.slipFooter.replace(/{days}/g, st.policyDays)));
}
function Receipt({
  o,
  st
}) {
  const paid = paidOf(o);
  const balance = balanceOf(o);
  const last = o.payments[o.payments.length - 1];
  return React.createElement("div", {
    className: "doc"
  }, React.createElement("div", {
    className: "doc-head"
  }, React.createElement("div", {
    className: "doc-shop"
  }, st.shopName), React.createElement("div", {
    className: "doc-line"
  }, shopLine(st))), React.createElement("div", {
    className: "doc-title"
  }, "RECEIPT"), React.createElement("div", {
    className: "doc-meta"
  }, React.createElement("div", null, React.createElement("span", null, "Receipt no."), React.createElement("b", null, "R-", o.id, "-", o.payments.length)), React.createElement("div", null, React.createElement("span", null, "Date"), React.createElement("b", null, last ? label(last.ts) : "")), React.createElement("div", null, React.createElement("span", null, "Received from"), React.createElement("b", null, o.customerName)), React.createElement("div", null, React.createElement("span", null, "For order"), React.createElement("b", null, o.id)), last && last.by && React.createElement("div", null, React.createElement("span", null, "Served by"), React.createElement("b", null, last.by))), React.createElement("table", {
    className: "doc-items"
  }, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "Payment"), React.createElement("th", null, "Method"), React.createElement("th", null, "Amount"))), React.createElement("tbody", null, o.payments.map((p, i) => React.createElement("tr", {
    key: i
  }, React.createElement("td", null, label(p.ts), p.amount < 0 ? " (reversal)" : ""), React.createElement("td", null, p.method), React.createElement("td", null, fmt(p.amount)))))), React.createElement("div", {
    className: "doc-totals"
  }, React.createElement("div", null, React.createElement("span", null, "Order total"), React.createElement("b", null, fmt(o.total))), React.createElement("div", {
    className: "doc-grand"
  }, React.createElement("span", null, "TOTAL PAID"), React.createElement("b", null, fmt(paid))), React.createElement("div", null, React.createElement("span", null, "Balance due"), React.createElement("b", null, fmt(balance)))), React.createElement("div", {
    className: "doc-foot"
  }, balance === 0 ? "Paid in full — thank you!" : "Balance payable on collection. Thank you!"));
}
const CSS = `

:root {
  --blue: #2563EB;
  --blue-dark: #1D4ED8;
  --blue-soft: #EFF4FF;
  --ink: #0F172A;
  --muted: #566478;
  --bg: #F1F5F9;
  --card: #FFFFFF;
  --line: #E2E8F0;
  --green: #16A34A;
  --red: #DC2626;
  --amber: #B45309;
  --radius: 12px;
}
* { box-sizing: border-box; }
.app { min-height: 100vh; background: var(--bg); color: var(--ink); font-family: 'Inter', system-ui, sans-serif; font-size: 16px; }
h1 { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
h2 { font-size: 16.5px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.01em; }
h2.mt { margin-top: 26px; }
.muted { color: var(--muted); margin: 0 0 14px; font-size: 14px; }
.tiny { font-size: 12.5px; color: var(--muted); text-align: center; margin: 10px 0 0; }
.tiny.left { text-align: left; }
.center-text { text-align: center; }

/* ---------- layout: sidebar + main ---------- */
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 236px; flex-shrink: 0; background: var(--card); border-right: 1px solid var(--line); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
.sb-brand { display: flex; align-items: center; gap: 10px; padding: 18px 16px 14px; border-bottom: 1px solid var(--line); }
.sb-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--blue); display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
.sb-brand b { display: block; font-size: 14.5px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.2; }
.sb-brand span { display: block; font-size: 11.5px; color: var(--muted); }
.sb-nav { padding: 12px 10px; display: grid; gap: 3px; flex: 1; overflow-y: auto; }
.sb-nav button { display: flex; align-items: center; gap: 11px; width: 100%; border: 0; background: transparent; color: #334155; font: inherit; font-weight: 600; font-size: 14px; padding: 10px 13px; border-radius: 10px; cursor: pointer; text-align: left; transition: background 0.12s ease, color 0.12s ease; }
.sb-nav button i { font-style: normal; font-size: 16px; width: 20px; text-align: center; }
.sb-nav button:hover { background: var(--bg); }
.sb-nav button.on { background: var(--blue); color: #fff; }
.sb-badge { margin-left: auto; background: var(--blue-soft); color: var(--blue-dark); font-size: 11px; font-weight: 700; font-style: normal; padding: 2px 8px; border-radius: 999px; }
.sb-nav button.on .sb-badge { background: rgba(255,255,255,0.22); color: #fff; }
.sb-foot { border-top: 1px solid var(--line); padding: 12px 14px; display: grid; gap: 9px; }
.sb-user { display: flex; align-items: center; gap: 9px; }
.sb-avatar { width: 32px; height: 32px; border-radius: 999px; background: var(--blue-soft); color: var(--blue-dark); display: grid; place-items: center; font-weight: 800; font-size: 13px; }
.sb-user b { display: block; font-size: 13px; line-height: 1.2; }
.sb-user span { display: block; font-size: 11.5px; color: var(--muted); }
.btn-lock { border: 1px solid var(--line); background: #fff; color: var(--muted); font: inherit; font-weight: 600; font-size: 13px; padding: 8px 12px; border-radius: 9px; cursor: pointer; transition: background 0.12s ease; }
.btn-lock:hover { background: var(--bg); }

.main-col { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.wrap { width: 100%; max-width: 1160px; margin: 0 auto; padding: 24px clamp(14px, 3vw, 32px) 8px; flex: 1; }
.page-head { margin-bottom: 18px; }
.page-head p { margin: 3px 0 0; color: var(--muted); font-size: 14px; }

.panel { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
.panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.panel-total { font-weight: 800; font-size: 18px; color: var(--blue-dark); }

/* ---------- login ---------- */
.login-wrap { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--bg); }
.login-card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 36px 32px; box-shadow: 0 12px 34px rgba(15,23,42,0.08); width: min(400px, 100%); text-align: center; }
.login-title { font-size: 21px; margin: 10px 0 2px; }
.brand-drop.big { display: inline-grid; place-items: center; width: 58px; height: 58px; border-radius: 15px; background: var(--blue); font-size: 28px; }
.pin-row { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
.pin-field { max-width: 150px; text-align: center; letter-spacing: 7px; font-family: 'IBM Plex Mono', monospace; font-size: 18px; }
.pin-error { color: var(--red); font-weight: 600; font-size: 13.5px; margin: 10px 0 0; }

.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 22px; background: var(--ink); color: #fff; padding: 11px 18px; border-radius: 10px; font-size: 13.5px; box-shadow: 0 10px 26px rgba(15,23,42,0.35); z-index: 90; max-width: min(92vw, 520px); animation: toastIn 0.25s ease; }
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ---------- forms & buttons ---------- */
.form { display: grid; gap: 12px; max-width: 460px; }
.form.two-col { max-width: none; grid-template-columns: 1fr 1fr; }
.form label { display: grid; gap: 5px; font-size: 13px; font-weight: 600; color: var(--muted); }
.form .span2 { grid-column: 1 / -1; }
input, select, textarea { font: inherit; color: var(--ink); padding: 9px 12px; border: 1px solid #CBD5E1; border-radius: 9px; background: #fff; width: 100%; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
.btn-main { border: 0; background: var(--blue); color: #fff; font: inherit; font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 9px; cursor: pointer; transition: background 0.15s ease, transform 0.12s ease; }
.btn-main:hover { background: var(--blue-dark); }
.btn-main:active { transform: scale(0.97); }
.btn-main.small { padding: 8px 14px; font-size: 13px; }
.btn-main.w-full { width: 100%; margin-top: 12px; }
.btn-main.danger-bg { background: var(--red); }
.btn-ghost { border: 1px solid #CBD5E1; background: #fff; color: #475569; font: inherit; font-weight: 600; font-size: 13.5px; padding: 9px 16px; border-radius: 9px; cursor: pointer; transition: background 0.12s ease; }
.btn-ghost:hover { background: var(--bg); }
.btn-ghost.small { padding: 7px 13px; font-size: 13px; }
.btn-ghost.danger { color: var(--red); border-color: #FECACA; }
.btn-main:focus-visible, .btn-ghost:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.btn-wa { display: inline-flex; align-items: center; gap: 6px; border: 0; background: #22C55E; color: #fff; text-decoration: none; font: inherit; font-weight: 700; padding: 10px 20px; border-radius: 9px; cursor: pointer; }
.btn-wa:hover { background: #16A34A; }

/* ---------- stat cards ---------- */
.report-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.stat-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; transition: transform 0.16s ease, box-shadow 0.16s ease; }
.stat:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15,23,42,0.08); }
.stat-lbl { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.stat b { display: block; font-size: 23px; font-weight: 800; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.stat span:last-child { font-size: 12px; color: var(--muted); }
.c-blue { color: var(--blue-dark); }
.c-green { color: var(--green); }
.c-red { color: var(--red); }
.c-amber { color: var(--amber); }

/* chart */
.chart { width: 100%; height: auto; display: block; }
.bar-on { fill: var(--blue); }
.bar-off { fill: #E2E8F0; }
.bar-lbl { font-size: 11px; fill: var(--muted); font-family: 'Inter', sans-serif; }

/* ---------- services ---------- */
.order-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; }
.svc-group { margin-bottom: 6px; }
.svc-cat { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--blue-dark); margin: 18px 0 8px; }
.svc-row { display: flex; align-items: center; gap: 12px; padding: 8px 4px; border-bottom: 1px solid #F1F5F9; }
.svc-icon { font-size: 19px; width: 28px; text-align: center; }
.svc-info { flex: 1; }
.svc-info div { font-weight: 600; }
.svc-info span { font-size: 13px; color: var(--muted); }
.qty { display: flex; align-items: center; gap: 2px; }
.qty button { width: 36px; height: 36px; border-radius: 9px; border: 1px solid #CBD5E1; background: #fff; color: var(--ink); font-size: 16px; font-weight: 700; cursor: pointer; line-height: 1; transition: all 0.12s ease; }
.qty button:hover { border-color: var(--blue); color: var(--blue); background: var(--blue-soft); }
.qty button:active { transform: scale(0.9); }
.qty span { min-width: 32px; text-align: center; font-weight: 700; font-variant-numeric: tabular-nums; }
.express { display: flex; gap: 10px; align-items: center; margin-top: 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 11px 13px; cursor: pointer; }
.express input { width: 18px; height: 18px; accent-color: var(--blue); }
.express div div { font-weight: 700; }
.express span { font-size: 12.5px; color: var(--muted); }
.express-inline { display: flex; align-items: center; gap: 8px; flex-direction: row !important; font-size: 14px !important; color: var(--ink) !important; }
.express-inline input { width: 18px; }
.phone-wrap { display: flex; align-items: stretch; }
.phone-wrap .phone-cc { display: flex; align-items: center; padding: 0 11px; background: var(--bg); border: 1px solid #CBD5E1; border-right: 0; border-radius: 9px 0 0 9px; font-weight: 700; color: var(--muted); font-size: 13.5px; }
.phone-wrap input { border-radius: 0 9px 9px 0; }

/* ---------- order summary card (was manila ticket) ---------- */
.ticket { position: sticky; top: 16px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }
.ticket-hole, .ticket-serration { display: none; }
.ticket-head { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 10px; margin-bottom: 12px; }
.ticket-empty { text-align: center; font-size: 13px; color: var(--muted); padding: 26px 4px; line-height: 1.7; }
.ticket-lines { display: grid; gap: 8px; font-size: 14px; font-variant-numeric: tabular-nums; }
.ticket-lines > div { display: flex; justify-content: space-between; gap: 8px; }
.ticket-lines .rule { border-top: 1px dashed var(--line); height: 0; padding: 0; }
.ticket-total { font-size: 17px; font-weight: 800; }
.ticket-total b { color: var(--blue-dark); }
.btn-clear { display: block; width: 100%; margin-top: 8px; border: 1px dashed #CBD5E1; background: transparent; color: var(--muted); font: inherit; font-size: 13px; font-weight: 600; padding: 8px; border-radius: 9px; cursor: pointer; transition: background 0.12s ease; }
.btn-clear:hover { background: var(--bg); }

/* ---------- status cycle ---------- */
.cycle { display: flex; margin: 12px 0 10px; max-width: 560px; }
.cy-step { flex: 1; position: relative; text-align: center; }
.cy-step:not(:last-child)::after { content: ""; position: absolute; top: 6px; left: 50%; width: 100%; height: 3px; background: var(--line); z-index: 0; }
.cy-step.done:not(:last-child)::after { background: var(--blue); }
.cy-dot { position: relative; z-index: 1; display: inline-block; width: 15px; height: 15px; border-radius: 999px; background: #fff; border: 3px solid #CBD5E1; }
.cy-step.done .cy-dot { background: var(--blue); border-color: var(--blue); }
.cy-step.now .cy-dot { border-color: var(--blue); background: #fff; box-shadow: 0 0 0 4px rgba(37,99,235,0.2); animation: pulse 1.8s infinite; }
@keyframes pulse { 50% { box-shadow: 0 0 0 7px rgba(37,99,235,0.1); } }
@media (prefers-reduced-motion: reduce) { .cy-step.now .cy-dot { animation: none; } }
.cy-label { display: block; font-size: 11px; margin-top: 5px; line-height: 1.25; color: var(--muted); }
.cy-step.now .cy-label { font-weight: 700; color: var(--ink); }

/* ---------- chips & toolbar ---------- */
.chip { font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px; white-space: nowrap; }
.pay-paid { background: #DCFCE7; color: #15803D; }
.pay-partial { background: #FEF3C7; color: var(--amber); }
.pay-unpaid { background: #FEE2E2; color: var(--red); }
.express-chip { background: var(--ink); color: #fff; margin-left: 8px; letter-spacing: 0.08em; }
.cancel-chip { background: var(--red); color: #fff; margin-left: 8px; letter-spacing: 0.06em; }
.edited-chip { background: var(--bg); color: var(--muted); margin-left: 8px; }
.order-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.order-toolbar .search { max-width: 320px; }
.chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-btn { border: 1px solid #CBD5E1; background: #fff; color: #475569; font: inherit; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 9px; cursor: pointer; transition: all 0.12s ease; }
.chip-btn:hover { background: var(--bg); }
.chip-btn.on { background: var(--blue); border-color: var(--blue); color: #fff; }

/* ---------- orders ---------- */
.admin-order { padding: 16px 18px; transition: box-shadow 0.16s ease; }
.admin-order:hover { box-shadow: 0 6px 18px rgba(15,23,42,0.07); }
.order-cancelled { opacity: 0.75; background: #FEF6F6; }
.cancel-note { color: var(--red); font-weight: 600; }
.ao-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 15px; }
.ao-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; color: var(--muted); margin: 6px 0; }
.ao-items { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 13px; background: var(--bg); border-radius: 9px; padding: 8px 12px; margin: 6px 0 2px; }
.ao-items b { margin-left: auto; }
.ao-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
.pay-form, .cancel-form { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
.pay-form input, .cancel-form input { max-width: 240px; padding: 7px 10px; font-size: 13px; }
.pay-form select { max-width: 170px; padding: 7px 10px; font-size: 13px; }
.pay-log { margin-top: 9px; font-size: 13px; color: var(--muted); display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.pay-reversal { color: var(--red); }
.pay-reversed { text-decoration: line-through; opacity: 0.7; }
.reverse-btn { border: 0; background: none; color: var(--red); font-size: 15px; cursor: pointer; padding: 4px 8px; margin-left: 2px; border-radius: 7px; }
.reverse-btn:hover { background: #FEE2E2; }
.wa-mini { display: inline-block; font-size: 12.5px; font-weight: 700; color: #15803D; text-decoration: none; border: 1px solid #86EFAC; background: #F0FDF4; padding: 7px 12px; border-radius: 9px; transition: background 0.12s ease; }
.wa-mini:hover { background: #DCFCE7; }

/* ---------- edit overlay ---------- */
.edit-panel { background: #fff; max-width: 560px; margin: 0 auto; border-radius: 14px; padding: 22px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); animation: popIn 0.25s ease both; }
.confirm-panel { max-width: 440px; margin-top: 10vh; }
.confirm-panel input { margin: 4px 0 14px; }

/* ---------- inline validation, quick amounts, warnings ---------- */
.err-box { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-top: 12px; text-align: left; }
.err-box ul { margin: 6px 0 0; padding-left: 18px; }
.err-box li { margin: 3px 0; }
.amt-chips { display: flex; gap: 6px; margin-top: 6px; }
.amt-chip { border: 1px solid #BFDBFE; background: var(--blue-soft); color: var(--blue-dark); font: inherit; font-size: 12.5px; font-weight: 700; padding: 6px 12px; border-radius: 999px; cursor: pointer; white-space: nowrap; transition: background 0.12s ease; }
.amt-chip:hover { background: #DBEAFE; }
.overpay-note { flex-basis: 100%; font-size: 12.5px; color: var(--amber); font-weight: 600; }
.warn-banner { background: #FFFBEB; border: 1px solid #FDE68A; color: #92400E; border-radius: 10px; padding: 10px 14px; font-size: 13.5px; margin-bottom: 14px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.warn-banner .ft-link { color: #92400E; }
.edit-adders { display: grid; gap: 8px; margin: 12px 0 4px; }
.edit-add { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 6px 0; }
.edit-add input, .edit-add select { flex: 1; min-width: 140px; padding: 8px 10px; font-size: 13.5px; }
.edit-add .narrow { max-width: 130px; flex: 0 1 auto; }
.edit-fields { margin-top: 12px; }
.edit-total { margin: 14px 0 12px; font-size: 14px; font-variant-numeric: tabular-nums; background: var(--blue-soft); border-radius: 9px; padding: 10px 12px; }
.edit-actions { display: flex; gap: 8px; }
@keyframes popIn { from { opacity: 0; transform: translateY(14px) scale(0.98); } to { opacity: 1; transform: none; } }

/* ---------- customer search (combo box) ---------- */
.cust-search { position: relative; max-width: 460px; }
.cust-combo { position: relative; }
.cust-combo input { padding-right: 34px; }
.combo-arrow { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 12px; pointer-events: none; }
.cust-results { position: absolute; left: 0; right: 0; top: 46px; z-index: 30; background: #fff; border: 1px solid var(--line); border-radius: 10px; overflow-y: auto; max-height: 280px; box-shadow: 0 14px 34px rgba(15,23,42,0.14); animation: fadeUp 0.15s ease; }
.cust-result { display: flex; justify-content: space-between; align-items: center; gap: 10px; width: 100%; text-align: left; border: 0; background: #fff; font: inherit; padding: 11px 14px; cursor: pointer; border-bottom: 1px solid #F1F5F9; transition: background 0.12s ease; }
.cust-result:last-child { border-bottom: 0; }
.cust-result:hover, .cust-result.hi { background: var(--blue-soft); }
.print-modal-body, .edit-panel, .print-doc { outline: none; }
.cust-result span { color: var(--muted); font-size: 12.5px; }
.cust-none { padding: 11px 14px; color: var(--muted); font-size: 13.5px; }
.new-cust-btn { margin-top: 10px; }
.cust-selected { display: flex; justify-content: space-between; align-items: center; gap: 10px; max-width: 460px; background: var(--blue-soft); border: 1px solid #BFDBFE; border-radius: 10px; padding: 11px 14px; }
.new-cust-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: var(--blue-dark); }

/* ---------- dashboard rows ---------- */
.report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.dash-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 2px; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
.dash-row:last-child { border-bottom: 0; }
.dash-sub { display: block; font-size: 13px; color: var(--muted); margin-top: 2px; }
.dash-acts { display: flex; gap: 6px; align-items: center; }
.bar-cell { width: 40%; }
.bar { height: 9px; background: var(--blue); border-radius: 999px; min-width: 4px; }

/* ---------- tables ---------- */
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); padding: 9px 10px; border-bottom: 1px solid var(--line); background: #F8FAFC; }
.table td { padding: 10px; border-bottom: 1px solid #F1F5F9; font-variant-numeric: tabular-nums; }
.table tr:hover td { background: #FAFBFD; }
.table .num, .table th.num { text-align: right; }
.price-input { max-width: 110px; font-weight: 600; }
.cust-edit-row input { padding: 6px 8px; font-size: 13px; }
.role-admin { background: var(--blue); color: #fff; }
.role-staff { background: var(--bg); color: var(--muted); }
.pin-cell { font-family: 'IBM Plex Mono', monospace; letter-spacing: 2px; }

/* ---------- settings ---------- */
.msg-area { max-width: 640px; resize: vertical; margin-bottom: 8px; }
.msg-preview { max-width: 640px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 10px 13px; font-size: 13px; margin: 4px 0 10px; line-height: 1.5; }
.small-note { font-size: 12.5px; }
.small-note code { background: var(--bg); padding: 1px 5px; border-radius: 5px; font-size: 12px; }
.setting-list { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.setting-item { display: inline-flex; align-items: center; gap: 7px; background: var(--bg); border: 1px solid var(--line); border-radius: 9px; padding: 7px 8px 7px 14px; font-size: 13.5px; font-weight: 600; }
.item-x { border: 0; background: #fff; color: var(--red); width: 26px; height: 26px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 700; line-height: 1; transition: background 0.12s ease; }
.item-x:hover { background: #FEE2E2; }

/* ---------- cloud sync ---------- */
.sync-chip { font-size: 12.5px; font-weight: 700; padding: 6px 10px; border-radius: 9px; text-align: center; }
.sync-idle { background: #DCFCE7; color: #15803D; }
.sync-syncing { background: var(--blue-soft); color: var(--blue-dark); }
.sync-offline { background: #FEF3C7; color: #92400E; }
.sync-error { background: #FEE2E2; color: var(--red); }
.link-code { font-family: 'IBM Plex Mono', monospace; word-break: break-all; user-select: all; background: var(--bg); padding: 8px 10px; border-radius: 8px; }
.show-more { display: block; width: 100%; margin-top: 4px; }

/* ---------- footer ---------- */
.ft { text-align: center; font-size: 12px; color: var(--muted); padding: 14px 12px 18px; }
.ft-actions { display: inline-flex; gap: 12px; margin-left: 12px; flex-wrap: wrap; }
.ft-link { border: 0; background: none; color: var(--blue-dark); font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0; }
.ft-note { color: var(--muted); font-weight: 600; }
.reset-link { border: 0; background: none; color: var(--red); font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; padding: 0; }
.hidden-input { display: none; }
button:disabled { opacity: 0.45; cursor: not-allowed; }

/* ---------- print docs (unchanged look for paper) ---------- */
.print-overlay { position: fixed; inset: 0; z-index: 80; background: rgba(15,23,42,0.55); overflow: auto; padding: 26px 14px 100px; }
.print-doc { background: #fff; max-width: 420px; margin: 0 auto; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); animation: popIn 0.25s ease both; }
.print-actions { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 81; flex-wrap: wrap; justify-content: center; }
.print-actions .btn-ghost { background: #fff; }
.shell-dim { filter: blur(1px); pointer-events: none; user-select: none; }

.doc { font-family: 'IBM Plex Mono', ui-monospace, monospace; color: #111; padding: 22px 20px; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.doc-head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; }
.doc-shop { font-weight: 700; font-size: 15px; letter-spacing: 0.02em; }
.doc-line { font-size: 11px; margin-top: 2px; }
.doc-title { text-align: center; font-weight: 700; letter-spacing: 0.3em; margin: 10px 0; font-size: 13px; }
.doc-meta { display: grid; gap: 4px; border-bottom: 1.5px dashed #999; padding-bottom: 10px; margin-bottom: 8px; }
.doc-meta div { display: flex; justify-content: space-between; gap: 10px; }
.doc-meta span { color: #555; }
.doc-items { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }
.doc-items th { text-align: left; font-size: 10.5px; letter-spacing: 0.06em; border-bottom: 1px solid #111; padding: 4px 2px; }
.doc-items td { padding: 4px 2px; border-bottom: 1px dotted #ccc; }
.doc-items th:last-child, .doc-items td:last-child, .doc-items th:nth-child(3), .doc-items td:nth-child(3) { text-align: right; }
.doc-totals { display: grid; gap: 4px; border-top: 1.5px dashed #999; padding-top: 8px; }
.doc-totals div { display: flex; justify-content: space-between; }
.doc-grand { font-size: 15px; font-weight: 700; }
.doc-tags { margin-top: 12px; border: 1px dashed #999; padding: 8px 10px; }
.doc-tags-title { font-size: 10.5px; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 5px; }
.doc-tag { font-size: 11.5px; padding: 2px 0; }
.doc-notes { margin-top: 10px; font-size: 11.5px; border: 1px dashed #999; padding: 7px 9px; }
.doc-foot { text-align: center; margin-top: 14px; font-size: 11px; color: #444; line-height: 1.6; border-top: 2px solid #111; padding-top: 10px; }

.print-doc.thermal { max-width: 300px; }
.print-doc.thermal .doc { font-size: 11px; padding: 12px 10px; }
.print-doc.thermal .doc-shop { font-size: 13px; }
.print-doc.thermal .doc-title { letter-spacing: 0.2em; font-size: 11.5px; }
.print-doc.thermal .doc-grand { font-size: 13px; }
.print-doc.thermal .doc-items th { font-size: 9.5px; }

@media print {
  .no-print { display: none !important; }
  .shell { display: none !important; }
  .app { background: #fff !important; padding: 0 !important; }
  .print-overlay { position: static !important; background: none !important; padding: 0 !important; overflow: visible !important; }
  .print-doc { box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; }
  .print-doc.thermal { width: 80mm !important; max-width: 80mm !important; margin: 0 !important; }
}

/* ---------- loading + motion ---------- */
.loading-screen { display: grid; place-items: center; }
.loading-card { display: grid; place-items: center; gap: 10px; font-weight: 600; color: var(--muted); padding: 60px 20px; }
.loading-card .brand-drop { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 14px; background: var(--blue); font-size: 26px; animation: bob 1.2s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(-8px); } }
main.wrap > section { animation: fadeUp 0.28s ease both; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  main.wrap > section, .toast, .print-doc, .edit-panel { animation: none; }
  .loading-card .brand-drop { animation: none; }
  .stat, .admin-order { transition: none; }
}

/* ---------- responsive ---------- */
@media (max-width: 900px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; height: auto; position: static; border-right: 0; border-bottom: 1px solid var(--line); }
  .sb-nav { display: flex; overflow-x: auto; padding: 8px 10px; gap: 4px; }
  .sb-nav button { width: auto; white-space: nowrap; padding: 8px 12px; font-size: 13px; }
  .sb-foot { flex-direction: row; display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; }
  .order-grid { grid-template-columns: 1fr; }
  .ticket { position: static; }
  .form.two-col { grid-template-columns: 1fr; }
  .report-grid { grid-template-columns: 1fr; }
  .cy-label { font-size: 10px; }
}
`;
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(LaundryApp, null));
