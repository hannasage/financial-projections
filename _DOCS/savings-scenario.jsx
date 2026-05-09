/**
 * Savings Projection Tool
 * Single-file React component. Production-ready.
 * PocketDB integration: wire up load/save to the `scenario` state object.
 *
 * Dependencies: react, recharts
 * Fonts loaded via Google Fonts (IBM Plex Mono, Syne)
 */

import { useState, useMemo, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const START_YEAR = 2026;
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS      = Array.from({ length: 20 }, (_, i) => START_YEAR + i);

const COLORS = {
  bg:      "#07090C",
  surface: "#0D1117",
  faint:   "#0A0E14",
  border:  "#1B2535",
  accent:  "#C9F53A",  // chartreuse — 7.1:1 on bg
  dim:     "#8CB025",  // muted accent — 4.6:1 on bg
  blue:    "#5B9CF6",  // 4.8:1 on bg
  orange:  "#F97316",  // 4.6:1 on bg
  red:     "#F87171",  // 4.6:1 on bg
  purple:  "#C084FC",  // 5.2:1 on bg
  text:    "#DDE3EE",  // 13.5:1 on bg
  muted:   "#8396AB",  // 5.8:1 on bg — AA compliant at all sizes
};

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Absolute month offset from START_YEAR January */
const absMo = (year, monthIdx) => (year - START_YEAR) * 12 + monthIdx;

/** Format as $X,XXX */
const money = n => `$${Math.round(n).toLocaleString()}`;

/** Format as $Xk or $X.XM */
const shortK = n =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}k`;

/** Monthly net-of-tax income */
const netMonthly = (annualSalary, taxPct) => annualSalary * (1 - taxPct / 100) / 12;

/** Standard amortization payment */
function stdPayment(principal, annualRate, termMonths) {
  if (!principal || principal <= 0 || !termMonths || termMonths <= 0) return 0;
  if (annualRate === 0) return principal / termMonths;
  const r = annualRate / 100 / 12;
  return principal * r * Math.pow(1 + r, termMonths) / (Math.pow(1 + r, termMonths) - 1);
}

/**
 * Months until loan balance reaches zero.
 * Uses closed-form logarithmic solution: n = -ln(1 - rP/pmt) / ln(1+r)
 * Returns 9999 if payment doesn't cover interest.
 */
function payoffMonths(principal, annualRate, monthlyPmt) {
  if (!principal || principal <= 0 || monthlyPmt <= 0) return 0;
  if (annualRate === 0) return Math.ceil(principal / monthlyPmt);
  const r  = annualRate / 100 / 12;
  const rP = r * principal;
  if (monthlyPmt <= rP) return 9999;
  return Math.ceil(-Math.log(1 - rP / monthlyPmt) / Math.log(1 + r));
}

/** Total interest paid over loan lifetime */
const totalInterest = (principal, annualRate, monthlyPmt) => {
  const mo = payoffMonths(principal, annualRate, monthlyPmt);
  return mo >= 9999 || mo === 0 ? 0 : Math.max(0, monthlyPmt * mo - principal);
};

/** Human-readable payoff date for a purchase */
function payoffLabel(purchase) {
  const mo = payoffMonths(purchase.loanAmount, purchase.rate, purchase.payment);
  if (mo >= 9999) return "never";
  if (mo === 0)   return "—";
  const abs = absMo(purchase.year, purchase.monthIdx) + mo;
  const yr  = START_YEAR + Math.floor(abs / 12);
  return `${MONTHS[abs % 12]} ${yr}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core savings simulation.
 *
 * Mental model:
 *   envelope         = total discretionary cash available each month
 *   debtBurden       = existing debts, paid from envelope until each payoff date
 *   purchaseOutflow  = active loan payments, paid from envelope during loan period
 *   rentRelief       = housing cost freed when a house purchase begins (you stop renting)
 *   raiseBonus       = net-of-tax income *above* base salary, added on top of envelope
 *   savings_inflow   = envelope + raiseBonus + rentRelief − debtBurden − purchaseOutflow
 *
 * Down payments are deducted from the savings balance at purchase month.
 * House purchase: rent is freed from purchase month forward, even after mortgage payoff.
 */
function simulate({ envelope, startSavings, startAge, returnRate, debts, purchases, raises, taxPct, horizonYears, housingCost }) {
  const totalMonths = horizonYears * 12;

  // Pre-sort raises chronologically
  const sortedRaises = [...raises].sort(
    (a, b) => absMo(a.year, a.monthIdx) - absMo(b.year, b.monthIdx)
  );

  // Pre-compute purchase start/payoff months once
  const purchaseMeta = purchases.map(p => ({
    ...p,
    startM:  absMo(p.year, p.monthIdx),
    payoffM: absMo(p.year, p.monthIdx) + payoffMonths(p.loanAmount, p.rate, p.payment),
  }));

  const baseSalary = raises[0]?.baseSalary ?? null;
  let savings = startSavings;
  const rows  = [];

  for (let m = 0; m <= totalMonths; m++) {
    const yr  = START_YEAR + Math.floor(m / 12);
    const age = startAge + m / 12;

    // ── Raise bonus ──────────────────────────────────────────────────────────
    let raiseBonus = 0;
    if (baseSalary !== null && sortedRaises.length > 0) {
      let currentSalary = baseSalary;
      for (const r of sortedRaises) {
        if (m >= absMo(r.year, r.monthIdx)) currentSalary = r.salary;
        else break;
      }
      raiseBonus = Math.max(0, netMonthly(currentSalary, taxPct) - netMonthly(baseSalary, taxPct));
    }

    // ── Existing debt burden ──────────────────────────────────────────────────
    const debtBurden = debts.reduce(
      (sum, d) => sum + (m < absMo(d.payoffYear, d.payoffMonthIdx) ? d.payment : 0),
      0
    );

    // ── Purchase outflows, down payments, housing relief ──────────────────────
    let purchaseOutflow = 0;
    let downThisMonth   = 0;
    let rentRelief      = 0;
    const activePurchases = [];

    for (const p of purchaseMeta) {
      if (m === p.startM && p.downPayment > 0) {
        downThisMonth += p.downPayment;
      }
      if (m >= p.startM && m < p.payoffM) {
        purchaseOutflow += p.payment;
        activePurchases.push(p.label || "Purchase");
      }
      // House: stops rent from purchase month onward, including after payoff
      if (p.type === "house" && m >= p.startM) {
        rentRelief += housingCost;
      }
    }

    if (downThisMonth > 0) savings -= downThisMonth;

    const effectiveEnv   = envelope + raiseBonus + rentRelief;
    const savingsInflow  = effectiveEnv - debtBurden - purchaseOutflow;

    savings = returnRate > 0
      ? savings * (1 + returnRate / 12) + savingsInflow
      : savings + savingsInflow;

    rows.push({
      m,
      yr,
      age:            parseFloat(age.toFixed(2)),
      ageFloor:       Math.floor(age),
      savings:        Math.round(savings),
      savingsInflow:  Math.round(savingsInflow),
      debtBurden:     Math.round(debtBurden),
      purchaseOutflow:Math.round(purchaseOutflow),
      raiseBonus:     Math.round(raiseBonus),
      rentRelief:     Math.round(rentRelief),
      effectiveEnv:   Math.round(effectiveEnv),
      activePurchases,
    });
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENT STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = {
  label: {
    fontSize: 10, letterSpacing: 2,
    color: COLORS.muted, textTransform: "uppercase",
  },
  field: {
    background: COLORS.faint, color: COLORS.text,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4, padding: "7px 9px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, outline: "none",
    WebkitAppearance: "none", appearance: "none",
  },
};

const chipStyle = (active, color = COLORS.accent) => ({
  padding: "5px 9px", fontSize: 11, borderRadius: 4,
  border:      `1px solid ${active ? color : COLORS.border}`,
  background:  active ? `${color}22` : "transparent",
  color:       active ? color : COLORS.muted,
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: "pointer", transition: "all 0.12s", whiteSpace: "nowrap",
});

const addBtnStyle = {
  padding: "6px 13px", fontSize: 11, borderRadius: 4,
  border: `1px solid ${COLORS.border}`,
  background: "transparent", color: COLORS.muted,
  fontFamily: "'IBM Plex Mono', monospace",
  cursor: "pointer", flexShrink: 0,
};

const iconBtn = {
  background: "none", border: "none", color: COLORS.muted,
  fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionHead({ label, onAdd, addLabel = "+ Add" }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
      <span style={S.label}>{label}</span>
      {onAdd && <button onClick={onAdd} style={addBtnStyle}>{addLabel}</button>}
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 6, padding: "10px 14px",
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, minWidth: 175,
    }}>
      <div style={{ color: COLORS.accent, fontWeight: 600, marginBottom: 5 }}>
        Age {d.ageFloor} · {d.yr}
      </div>
      <div style={{ color: COLORS.text, fontSize: 13, marginBottom: 5 }}>
        {money(d.savings)}
      </div>
      <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 5, lineHeight: 2.1 }}>
        <div style={{ color: COLORS.muted }}>envelope: {money(d.effectiveEnv)}/mo</div>
        {d.debtBurden      > 0 && <div style={{ color: COLORS.red    }}>− debt: {money(d.debtBurden)}/mo</div>}
        {d.purchaseOutflow > 0 && <div style={{ color: COLORS.orange }}>− loans: {money(d.purchaseOutflow)}/mo</div>}
        {d.raiseBonus      > 0 && <div style={{ color: COLORS.accent }}>+ raise: {money(d.raiseBonus)}/mo</div>}
        {d.rentRelief      > 0 && <div style={{ color: COLORS.blue   }}>+ rent freed: {money(d.rentRelief)}/mo</div>}
        <div style={{ color: COLORS.dim }}>→ saving {money(d.savingsInflow)}/mo</div>
      </div>
    </div>
  );
}

function DebtItem({ d, onChange, onRemove }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${COLORS.border}20` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <input
          value={d.label}
          placeholder="Label (e.g. CC, student loan…)"
          aria-label="Debt label"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span aria-hidden="true" style={{ color: COLORS.red, fontSize: 10 }}>−$</span>
          <input
            type="number" value={d.payment} min={0} max={99999} step={25}
            aria-label={`Monthly payment for ${d.label || "this debt"}`}
            onChange={e => onChange({ payment: +e.target.value })}
            style={{ ...S.field, width: 80 }}
          />
          <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
        </div>
        <button onClick={onRemove} aria-label={`Remove debt: ${d.label || "unnamed"}`} style={iconBtn}>×</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: COLORS.muted }}>Pays off</span>
        <select
          value={d.payoffMonthIdx} aria-label="Payoff month"
          onChange={e => onChange({ payoffMonthIdx: +e.target.value })}
          style={{ ...S.field, flex: "1 1 70px" }}
        >
          {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
        </select>
        <select
          value={d.payoffYear} aria-label="Payoff year"
          onChange={e => onChange({ payoffYear: +e.target.value })}
          style={{ ...S.field, flex: "1 1 70px" }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize: 11, color: COLORS.dim }}>→ {money(d.payment)}/mo freed</span>
      </div>
    </div>
  );
}

function PurchaseItem({ p, onChange, onRemove, housingCost }) {
  const isHouse = p.type === "house";
  const typeColor = isHouse ? COLORS.blue : COLORS.orange;

  // All std payments derived fresh from current props — no stale cache
  const std60  = stdPayment(p.loanAmount, p.rate, 60);
  const std120 = stdPayment(p.loanAmount, p.rate, 120);
  const std180 = stdPayment(p.loanAmount, p.rate, 180);
  const std240 = stdPayment(p.loanAmount, p.rate, 240);
  const std360 = stdPayment(p.loanAmount, p.rate, 360);

  const payMo     = payoffMonths(p.loanAmount, p.rate, p.payment);
  const interest  = totalInterest(p.loanAmount, p.rate, p.payment);
  const netImpact = isHouse ? p.payment - housingCost : null;

  // ── Atomic updaters — each produces a single onChange call ──────────────────

  // Change term or multiplier → recompute payment
  const applyTerm = useCallback((termMonths, multiplier = 1) =>
    onChange({
      termMonths,
      multiplier,
      payment: Math.round(stdPayment(p.loanAmount, p.rate, termMonths) * multiplier),
    }), [p.loanAmount, p.rate, onChange]);

  // Change loan amount → recompute payment using stored term/multiplier
  const applyLoanAmount = useCallback(v =>
    onChange({
      loanAmount: v,
      payment: Math.round(stdPayment(v, p.rate, p.termMonths) * p.multiplier),
    }), [p.rate, p.termMonths, p.multiplier, onChange]);

  // Change rate → recompute payment using stored term/multiplier
  const applyRate = useCallback(v =>
    onChange({
      rate: v,
      payment: Math.round(stdPayment(p.loanAmount, v, p.termMonths) * p.multiplier),
    }), [p.loanAmount, p.termMonths, p.multiplier, onChange]);

  // Manual payment override → back-calculate multiplier so future changes scale correctly
  const applyPayment = useCallback(v => {
    const base = stdPayment(p.loanAmount, p.rate, p.termMonths);
    onChange({ payment: v, multiplier: base > 0 ? v / base : 1 });
  }, [p.loanAmount, p.rate, p.termMonths, onChange]);

  // Term quick-set buttons — shown conditionally based on loan size and type
  // Term options shown in dropdown — filtered by loan size
  const termOptions = [
    { mo: 12,  label: "12 mo. / 1 yr."  },
    { mo: 24,  label: "24 mo. / 2 yr."  },
    { mo: 36,  label: "36 mo. / 3 yr."  },
    { mo: 48,  label: "48 mo. / 4 yr."  },
    { mo: 60,  label: "60 mo. / 5 yr."  },
    { mo: 84,  label: "84 mo. / 7 yr."  },
    { mo: 120, label: "120 mo. / 10 yr.", minLoan: 10_000  },
    { mo: 180, label: "180 mo. / 15 yr.", minLoan: 50_000  },
    { mo: 240, label: "240 mo. / 20 yr.", minLoan: 100_000 },
    { mo: 360, label: "360 mo. / 30 yr.", minLoan: 100_000 },
  ].filter(o => !o.minLoan || p.loanAmount >= o.minLoan);

  // Multiplier chips — shown for all purchase types
  const multOptions = [
    { mult: 1,   label: "1×",   color: COLORS.blue   },
    { mult: 1.5, label: "1.5×", color: COLORS.accent },
    { mult: 2,   label: "2×",   color: COLORS.orange },
  ];

  return (
    <div style={{
      background: COLORS.surface, borderRadius: 6,
      border: `1px solid ${typeColor}40`, padding: "14px", marginTop: 10,
    }}>
      {/* Row 1: type toggle · label · remove */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <div style={{
          display: "flex", borderRadius: 4, overflow: "hidden",
          border: `1px solid ${COLORS.border}`, flexShrink: 0,
        }}>
          {[["loan","🚗 Loan"],["house","🏠 House"]].map(([typeKey, typeLabel]) => (
            <button
              key={typeKey}
              onClick={() => onChange({ type: typeKey })}
              aria-pressed={p.type === typeKey}
              style={{
                padding: "6px 10px", fontSize: 10, border: "none",
                cursor: "pointer", transition: "all 0.12s",
                fontFamily: "'IBM Plex Mono', monospace",
                background: p.type === typeKey
                  ? (typeKey === "house" ? `${COLORS.blue}30` : `${COLORS.orange}30`)
                  : "transparent",
                color: p.type === typeKey
                  ? (typeKey === "house" ? COLORS.blue : COLORS.orange)
                  : COLORS.muted,
              }}
            >
              {typeLabel}
            </button>
          ))}
        </div>
        <input
          value={p.label}
          placeholder={isHouse ? "e.g. First home, Condo…" : "e.g. Corvette C8, Boat…"}
          aria-label="Purchase label"
          onChange={e => onChange({ label: e.target.value })}
          style={{ ...S.field, flex: 1, minWidth: 0 }}
        />
        <button onClick={onRemove} aria-label={`Remove: ${p.label || "purchase"}`} style={iconBtn}>×</button>
      </div>

      {/* Row 2: purchase date */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ ...S.label, letterSpacing: 1 }}>Purchase date</span>
        <select
          value={p.monthIdx} aria-label="Purchase month"
          onChange={e => onChange({ monthIdx: +e.target.value })}
          style={{ ...S.field, flex: "1 1 70px" }}
        >
          {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
        </select>
        <select
          value={p.year} aria-label="Purchase year"
          onChange={e => onChange({ year: +e.target.value })}
          style={{ ...S.field, flex: "1 1 70px" }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Row 3: down · loan amount · rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          { id: `dp-${p.id}`,   labelText: "Down Payment", prefix: "$", value: p.downPayment, step: 1000, onChange: v => onChange({ downPayment: v }) },
          { id: `la-${p.id}`,   labelText: "Loan Amount",  prefix: "$", value: p.loanAmount,  step: 1000, onChange: v => applyLoanAmount(v) },
          { id: `apr-${p.id}`,  labelText: "Rate (APR)",   suffix: "%", value: p.rate,         step: 0.1,  onChange: v => applyRate(v) },
        ].map(({ id, labelText, prefix, suffix, value, step, onChange: onCh }) => (
          <div key={id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label htmlFor={id} style={S.label}>{labelText}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {prefix && <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>{prefix}</span>}
              <input
                id={id} type="number" value={value} min={0} step={step}
                onChange={e => onCh(+e.target.value)}
                style={{ ...S.field, width: "100%" }}
              />
              {suffix && <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>{suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: term + multiplier + manual payment */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Term dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: "1 1 160px" }}>
            <label htmlFor={`term-${p.id}`} style={S.label}>Loan Term</label>
            <select
              id={`term-${p.id}`}
              value={p.termMonths}
              aria-label="Loan term"
              onChange={e => applyTerm(+e.target.value, p.multiplier)}
              style={{ ...S.field, width: "100%" }}
            >
              {termOptions.map(o => (
                <option key={o.mo} value={o.mo}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Multiplier chips (loans only) */}
          {multOptions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={S.label}>Payment speed</span>
              <div style={{ display: "flex", gap: 5 }}>
                {multOptions.map(o => (
                  <button
                    key={o.mult}
                    onClick={() => applyTerm(p.termMonths, o.mult)}
                    style={chipStyle(Math.abs(p.multiplier - o.mult) < 0.001, o.color)}
                    aria-pressed={Math.abs(p.multiplier - o.mult) < 0.001}
                    aria-label={`${o.label} of standard payment`}
                  >
                    {o.label} {money(stdPayment(p.loanAmount, p.rate, p.termMonths) * o.mult)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Manual payment override */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <label htmlFor={`pmt-${p.id}`} style={S.label}>Monthly Payment</label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
            <input
              id={`pmt-${p.id}`}
              type="number" value={p.payment} min={0} step={25}
              aria-label="Monthly payment — type a custom amount or use term and speed controls above"
              onChange={e => applyPayment(+e.target.value)}
              style={{ ...S.field, flex: 1 }}
            />
            <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {p.loanAmount > 0 && p.payment > 0 && (
        <div style={{ borderRadius: 4, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex" }}>
            {[
              { key: "Payoff",    val: payoffLabel(p),                                         col: COLORS.accent },
              { key: "Months",    val: payMo >= 9999 ? "∞" : `${payMo} mo`,                  col: COLORS.text   },
              { key: "Interest",  val: money(interest),                                         col: COLORS.red    },
              { key: "vs 60mo",   val: std60 > 0 ? `${(p.payment / std60).toFixed(2)}×` : "—", col: COLORS.orange },
            ].map(({ key, val, col }) => (
              <div key={key} style={{ flex: 1, padding: "8px 10px", borderRight: `1px solid ${COLORS.border}`, background: COLORS.faint }}>
                <div style={{ color: COLORS.muted, marginBottom: 3, fontSize: 10, letterSpacing: 1 }}>{key}</div>
                <div style={{ color: col, fontWeight: 500, fontSize: 11 }}>{val}</div>
              </div>
            ))}
          </div>
          {isHouse && netImpact !== null && (
            <div style={{
              padding: "8px 12px", background: `${COLORS.blue}0C`,
              borderTop: `1px solid ${COLORS.border}`,
              fontSize: 11, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            }}>
              <span style={{ color: COLORS.muted }}>vs rent {money(housingCost)}/mo</span>
              <span style={{ color: netImpact > 0 ? COLORS.red : COLORS.accent, fontWeight: 500 }}>
                {netImpact > 0 ? `+${money(netImpact)}/mo more` : `${money(Math.abs(netImpact))}/mo cheaper`}
              </span>
              <span style={{ color: COLORS.blue }}>
                · net impact: {netImpact > 0 ? "−" : "+"}{money(Math.abs(netImpact))}/mo
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RaiseItem({ r, taxPct, baseSalary, onChange, onRemove }) {
  const boost = netMonthly(r.salary, taxPct) - netMonthly(baseSalary, taxPct);
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}20` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={r.monthIdx} aria-label="Raise effective month"
          onChange={e => onChange({ monthIdx: +e.target.value })}
          style={{ ...S.field, flex: "1 1 70px" }}
        >
          {MONTHS.map((mo, i) => <option key={i} value={i}>{mo}</option>)}
        </select>
        <select
          value={r.year} aria-label="Raise effective year"
          onChange={e => onChange({ year: +e.target.value })}
          style={{ ...S.field, flex: "1 1 70px" }}
        >
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "1 1 120px" }}>
          <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
          <input
            type="number" value={r.salary} step={5000} min={0}
            aria-label="New annual salary"
            onChange={e => onChange({ salary: +e.target.value })}
            style={{ ...S.field, width: "100%" }}
          />
          <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/yr</span>
        </div>
        <span style={{ fontSize: 11, color: boost >= 0 ? COLORS.accent : COLORS.red, whiteSpace: "nowrap" }}>
          {boost >= 0 ? "+" : ""}{money(boost)}/mo net
        </span>
        <button onClick={onRemove} aria-label="Remove this raise" style={iconBtn}>×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SCENARIO
// ─────────────────────────────────────────────────────────────────────────────

const makeId = () => crypto.randomUUID();

const DEFAULT_SCENARIO = (() => {
  const carLoan      = 45_000;
  const carRate      = 7;
  const carTerm      = 60;
  const carMult      = 2;
  const homeLoan     = 400_000;
  const homeRate     = 6.5;
  const homeTerm     = 360;
  return {
    envelope:     3_012,
    startSavings: 9_000,
    startAge:     31,
    horizonYears: 10,
    returnMode:   "hysa",
    taxPct:       35,
    baseSalary:   130_000,
    housingCost:  2_200,
    debts: [
      { id: makeId(), label: "Existing debt", payment: 2_800, payoffMonthIdx: 11, payoffYear: 2026 },
    ],
    purchases: [
      {
        id: makeId(), type: "loan", label: "2023 Corvette C8 2LT",
        year: 2027, monthIdx: 6,
        downPayment: 20_000, loanAmount: carLoan, rate: carRate,
        termMonths: carTerm, multiplier: carMult,
        payment: Math.round(stdPayment(carLoan, carRate, carTerm) * carMult),
      },
      {
        id: makeId(), type: "house", label: "First Home",
        year: 2031, monthIdx: 8,
        downPayment: 80_000, loanAmount: homeLoan, rate: homeRate,
        termMonths: homeTerm, multiplier: 1,
        payment: Math.round(stdPayment(homeLoan, homeRate, homeTerm)),
      },
    ],
    raises: [],
  };
})();

// ─────────────────────────────────────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────────────────────────────────────

export default function SavingsProjection() {
  // ── Scenario state ───────────────────────────────────────────────────────────
  // All fields mirror DEFAULT_SCENARIO — ready for PocketDB serialization.
  const [envelope,     setEnvelope]     = useState(DEFAULT_SCENARIO.envelope);
  const [startSavings, setStartSavings] = useState(DEFAULT_SCENARIO.startSavings);
  const [startAge,     setStartAge]     = useState(DEFAULT_SCENARIO.startAge);
  const [horizonYears, setHorizonYears] = useState(DEFAULT_SCENARIO.horizonYears);
  const [returnMode,   setReturnMode]   = useState(DEFAULT_SCENARIO.returnMode);
  const [taxPct,       setTaxPct]       = useState(DEFAULT_SCENARIO.taxPct);
  const [baseSalary,   setBaseSalary]   = useState(DEFAULT_SCENARIO.baseSalary);
  const [housingCost,  setHousingCost]  = useState(DEFAULT_SCENARIO.housingCost);
  const [debts,        setDebts]        = useState(DEFAULT_SCENARIO.debts);
  const [purchases,    setPurchases]    = useState(DEFAULT_SCENARIO.purchases);
  const [raises,       setRaises]       = useState(DEFAULT_SCENARIO.raises);

  // ── List managers ────────────────────────────────────────────────────────────
  const addDebt    = () => setDebts(d => [...d, { id: makeId(), label: "", payment: 200, payoffMonthIdx: 0, payoffYear: START_YEAR + 1 }]);
  const changeDebt = (id, patch) => setDebts(d => d.map(x => x.id === id ? { ...x, ...patch } : x));
  const rmDebt     = id => setDebts(d => d.filter(x => x.id !== id));

  const addPurchase = () => {
    const loanAmount = 30_000, rate = 7, termMonths = 60, multiplier = 1;
    setPurchases(ps => [...ps, {
      id: makeId(), type: "loan", label: "",
      year: START_YEAR + 2, monthIdx: 0,
      downPayment: 0, loanAmount, rate, termMonths, multiplier,
      payment: Math.round(stdPayment(loanAmount, rate, termMonths)),
    }]);
  };
  const changePurchase = (id, patch) => setPurchases(ps => ps.map(x => x.id === id ? { ...x, ...patch } : x));
  const rmPurchase     = id => setPurchases(ps => ps.filter(x => x.id !== id));

  const addRaise    = () => setRaises(r => [...r, { id: makeId(), year: START_YEAR + 3, monthIdx: 0, salary: baseSalary + 10_000, baseSalary }]);
  const changeRaise = (id, patch) => setRaises(r => r.map(x => x.id === id ? { ...x, ...patch } : x));
  const rmRaise     = id => setRaises(r => r.filter(x => x.id !== id));

  // ── Simulation ───────────────────────────────────────────────────────────────
  const returnRate = returnMode === "hysa" ? 0.045 : returnMode === "invested" ? 0.07 : 0;

  const data = useMemo(() => simulate({
    envelope, startSavings, startAge, returnRate,
    debts, purchases, raises, taxPct, horizonYears, housingCost,
  }), [envelope, startSavings, startAge, returnRate, debts, purchases, raises, taxPct, horizonYears, housingCost]);

  const yearly  = useMemo(() => data.filter(d => d.m % 12 === 0), [data]);
  const chart   = useMemo(() => data.filter(d => d.m % 2  === 0), [data]);
  const snap    = m => data[Math.min(m, data.length - 1)];
  const endM    = horizonYears * 12;

  // ── Derived UI values ────────────────────────────────────────────────────────
  const nowDebtBurden = debts.reduce(
    (s, d) => s + (absMo(d.payoffYear, d.payoffMonthIdx) > 0 ? d.payment : 0), 0
  );
  const nowLoanBurden = purchases.reduce((s, p) => {
    const sm  = absMo(p.year, p.monthIdx);
    const pm  = sm + payoffMonths(p.loanAmount, p.rate, p.payment);
    return s + (0 >= sm && 0 < pm ? p.payment : 0);
  }, 0);
  const effectiveNow = envelope - nowDebtBurden - nowLoanBurden;

  // Chart reference lines: one buy + one payoff marker per purchase
  const purchaseMarkers = purchases
    .filter(p => p.loanAmount > 0 && p.payment > 0)
    .map(p => {
      const sm  = absMo(p.year, p.monthIdx);
      const pmo = payoffMonths(p.loanAmount, p.rate, p.payment);
      return {
        buyAge:  parseFloat((startAge + sm / 12).toFixed(3)),
        paidAge: parseFloat((startAge + (sm + pmo) / 12).toFixed(3)),
        withinHorizon: (sm + pmo) / 12 <= horizonYears,
      };
    });

  const milestones = [
    { label: "Start",                          m: 0      },
    { label: `Year ${Math.round(horizonYears / 2)}`, m: Math.round(endM / 2) },
    { label: `Year ${horizonYears}`,           m: endM, hi: true },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .syne { font-family: 'Syne', sans-serif; }
          input[type=range] { accent-color: ${COLORS.accent}; cursor: pointer; width: 100%; }
          select:focus-visible, input:focus-visible, button:focus-visible {
            outline: 2px solid ${COLORS.accent}; outline-offset: 2px; border-radius: 3px;
          }
          .skip-link {
            position: absolute; left: -9999px; top: 8px;
            padding: 8px 16px; background: ${COLORS.accent}; color: #000;
            font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500;
            border-radius: 4px; z-index: 999; text-decoration: none;
          }
          .skip-link:focus { left: 8px; }
          .sec  { padding: 16px 18px; border-bottom: 1px solid ${COLORS.border}; }
          .g2   { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .tbl  { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .mg   { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          @media (min-width: 640px) {
            .sec { padding: 20px 28px; }
            .mg  { grid-template-columns: repeat(3, 1fr); }
          }
        `}</style>

        <a href="#main" className="skip-link">Skip to main content</a>

        {/* ── HEADER ── */}
        <header className="sec">
          <div style={{ ...S.label, marginBottom: 8 }} aria-hidden="true">Savings Projection Tool</div>
          <h1 className="syne" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 }}>
            Where Am I in {horizonYears} Years?
          </h1>
          <div
            role="status" aria-live="polite" aria-label="Current savings rate summary"
            style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 6, padding: "10px 13px", fontSize: 11, lineHeight: 2.3,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
              <span style={{ color: COLORS.text }}>Envelope: <strong>{money(envelope)}/mo</strong></span>
              {nowDebtBurden > 0 && <span style={{ color: COLORS.red }}>− debt: {money(nowDebtBurden)}/mo</span>}
              {nowLoanBurden > 0 && <span style={{ color: COLORS.orange }}>− loans: {money(nowLoanBurden)}/mo</span>}
              <span style={{ color: COLORS.accent }}>→ {money(effectiveNow)}/mo to savings now</span>
            </div>
            <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 2 }}>
              Debts and loans come from inside the envelope — they redirect to savings when cleared.
              House purchases free your rent; only the mortgage−rent delta affects savings.
            </div>
          </div>
        </header>

        <main id="main">

          {/* ── CORE SETTINGS ── */}
          <section className="sec" aria-label="Core settings">
            <SectionHead label="⚙️ Core Settings" />

            {/* Envelope slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label htmlFor="envelope-range" style={S.label}>Monthly Envelope</label>
                <span aria-hidden="true" style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}>{money(envelope)}/mo</span>
              </div>
              <input
                id="envelope-range" type="range" min={500} max={15_000} step={50}
                value={envelope}
                aria-label={`Monthly envelope: ${money(envelope)}`}
                aria-valuemin={500} aria-valuemax={15000} aria-valuenow={envelope}
                onChange={e => setEnvelope(+e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.muted }} aria-hidden="true">
                <span>$500</span><span>$15k</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: COLORS.muted }}>or type:</span>
                <span aria-hidden="true" style={{ color: COLORS.muted, fontSize: 10 }}>$</span>
                <input
                  type="number" value={envelope} min={0} step={50}
                  aria-label="Monthly envelope, typed"
                  onChange={e => setEnvelope(+e.target.value)}
                  style={{ ...S.field, width: 90 }}
                />
                <span aria-hidden="true" style={{ fontSize: 11, color: COLORS.muted }}>/mo</span>
              </div>
            </div>

            {/* Starting savings slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label htmlFor="savings-range" style={S.label}>Starting Savings</label>
                <span aria-hidden="true" style={{ color: COLORS.accent, fontSize: 12, fontWeight: 500 }}>{money(startSavings)}</span>
              </div>
              <input
                id="savings-range" type="range" min={0} max={200_000} step={1000}
                value={startSavings}
                aria-label={`Starting savings: ${money(startSavings)}`}
                aria-valuemin={0} aria-valuemax={200000} aria-valuenow={startSavings}
                onChange={e => setStartSavings(+e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.muted }} aria-hidden="true">
                <span>$0</span><span>$200k</span>
              </div>
            </div>

            {/* Grid of remaining fields */}
            <div className="g2" style={{ marginTop: 14 }}>
              {[
                { id: "start-age",     labelText: "Current Age",      val: startAge,     min: 18, max: 80,  step: 1,    set: setStartAge     },
                { id: "horizon",       labelText: "Horizon (years)",   val: horizonYears, min: 1,  max: 50,  step: 1,    set: setHorizonYears },
                { id: "base-salary",   labelText: "Base Salary ($)",   val: baseSalary,   min: 0,  max: null, step: 5000, set: setBaseSalary   },
                { id: "housing-cost",  labelText: "Monthly Rent ($)",  val: housingCost,  min: 0,  max: null, step: 50,   set: setHousingCost  },
                { id: "tax-pct",       labelText: "Effective Tax (%)", val: taxPct,       min: 0,  max: 60,  step: 1,    set: setTaxPct       },
              ].map(({ id, labelText, val, min, max, step, set }) => (
                <div key={id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label htmlFor={id} style={S.label}>{labelText}</label>
                  <input
                    id={id} type="number" value={val} min={min} step={step}
                    {...(max ? { max } : {})}
                    onChange={e => set(+e.target.value)}
                    style={{ ...S.field, width: "100%" }}
                  />
                </div>
              ))}

              {/* Growth rate toggle */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={S.label} id="growth-label">Growth Rate</span>
                <fieldset style={{ border: "none", padding: 0 }} aria-labelledby="growth-label">
                  <div style={{ display: "flex", gap: 5 }}>
                    {[["none","0% cash"],["hysa","4.5% HYSA"],["invested","7% index"]].map(([k, l]) => (
                      <button
                        key={k}
                        onClick={() => setReturnMode(k)}
                        aria-pressed={returnMode === k}
                        style={{ ...chipStyle(returnMode === k), flex: 1, padding: "7px 4px", fontSize: 10 }}
                      >{l}</button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
          </section>

          {/* ── ACTIVE DEBTS ── */}
          <section className="sec" aria-label="Active debts">
            <SectionHead label="💳 Active Debts" onAdd={addDebt} addLabel="+ Add Debt" />
            <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: debts.length ? 8 : 0 }}>
              Each payment comes from inside the envelope and redirects to savings when cleared.
            </p>
            {debts.length === 0 && (
              <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: "italic" }}>
                None — full envelope goes to savings.
              </p>
            )}
            {debts.map(d => (
              <DebtItem key={d.id} d={d} onChange={p => changeDebt(d.id, p)} onRemove={() => rmDebt(d.id)} />
            ))}
          </section>

          {/* ── MAJOR PURCHASES ── */}
          <section className="sec" aria-label="Major purchases">
            <SectionHead label="🛒 Major Purchases" onAdd={addPurchase} addLabel="+ Add Purchase" />
            <p style={{ fontSize: 11, color: COLORS.muted }}>
              Down payment hits savings at purchase. Loan comes from envelope until paid off.
            </p>
            {purchases.length === 0 && (
              <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: "italic" }}>None planned.</p>
            )}
            {purchases.map(p => (
              <PurchaseItem
                key={p.id} p={p} housingCost={housingCost}
                onChange={patch => changePurchase(p.id, patch)}
                onRemove={() => rmPurchase(p.id)}
              />
            ))}
          </section>

          {/* ── RAISE SCENARIOS ── */}
          <section className="sec" aria-label="Raise scenarios">
            <SectionHead label="📈 Raise Scenarios" onAdd={addRaise} addLabel="+ Add Raise" />
            <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: raises.length ? 8 : 0 }}>
              Net-of-tax income above base salary — added on top of envelope from effective month.
            </p>
            {raises.length === 0 && (
              <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 8, fontStyle: "italic" }}>
                No raises — base salary throughout.
              </p>
            )}
            {raises.map(r => (
              <RaiseItem
                key={r.id} r={r} taxPct={taxPct} baseSalary={baseSalary}
                onChange={patch => changeRaise(r.id, patch)}
                onRemove={() => rmRaise(r.id)}
              />
            ))}
          </section>

          {/* ── MILESTONES ── */}
          <section className="sec" aria-label="Savings milestones">
            <h2 style={{ ...S.label, marginBottom: 12 }}>Milestones</h2>
            <div className="mg">
              {milestones.map(s => (
                <div key={s.m} style={{
                  padding: "14px 12px",
                  background: s.hi ? `${COLORS.accent}0E` : COLORS.surface,
                  border: `1px solid ${s.hi ? COLORS.accent : COLORS.border}`,
                  borderRadius: 6,
                }}>
                  <div style={{ ...S.label, marginBottom: 6 }}>Age {Math.floor(startAge + s.m / 12)}</div>
                  <div className="syne" style={{ fontSize: 22, fontWeight: 800, color: s.hi ? COLORS.accent : COLORS.text, lineHeight: 1, marginBottom: 5 }}>
                    {money(snap(s.m).savings)}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
                  {s.hi && (
                    <div style={{ fontSize: 10, color: COLORS.dim, marginTop: 3 }}>
                      {returnMode === "none" ? "0% · cash" : returnMode === "hysa" ? "4.5% HYSA" : "7% invested"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── CHART ── */}
          <section className="sec" aria-label="Savings trajectory chart">
            <h2 style={{ ...S.label, marginBottom: 8 }}>Savings Trajectory</h2>
            <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 14 }}>🛒 purchase date · ✓ loan paid off</p>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={chart} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={COLORS.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 6" stroke={COLORS.faint} vertical={false} />
                <XAxis
                  dataKey="age"
                  type="number"
                  domain={[startAge, startAge + horizonYears]}
                  tickCount={Math.min(horizonYears + 1, 16)}
                  tickFormatter={v => (v % 1 < 0.01 || v % 1 > 0.99) ? Math.round(v) : ""}
                  tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={shortK}
                  tick={{ fill: COLORS.muted, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}
                  axisLine={false} tickLine={false} width={44}
                />
                <Tooltip content={<ChartTooltip />} />
                {purchaseMarkers.map((m, i) => (
                  <ReferenceLine key={`buy-${i}`} x={m.buyAge}
                    stroke={COLORS.orange} strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: "🛒", fill: COLORS.orange, fontSize: 10, position: "top" }} />
                ))}
                {purchaseMarkers.filter(m => m.withinHorizon).map((m, i) => (
                  <ReferenceLine key={`paid-${i}`} x={m.paidAge}
                    stroke={COLORS.blue} strokeDasharray="3 3" strokeWidth={1}
                    label={{ value: "✓", fill: COLORS.blue, fontSize: 10, position: "top" }} />
                ))}
                <Area
                  type="monotone" dataKey="savings"
                  stroke={COLORS.accent} strokeWidth={2}
                  fill="url(#chartGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: COLORS.accent, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* ── YEAR TABLE ── */}
          <section className="sec" aria-label="Year-by-year breakdown">
            <h2 style={{ ...S.label, marginBottom: 12 }}>Year-by-Year</h2>
            <div className="tbl">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 520 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {[
                      ["Age",       "Your age"],
                      ["Year",      "Calendar year"],
                      ["Balance",   "Total savings balance"],
                      ["Saving/mo", "Net amount saved per month"],
                      ["Debt −",    "Monthly debt payments"],
                      ["Loans −",   "Monthly loan payments"],
                      ["Active",    "Active purchase loans"],
                    ].map(([h, desc]) => (
                      <th key={h} scope="col" title={desc} style={{
                        padding: "6px 10px 8px", textAlign: "left",
                        color: COLORS.muted, fontWeight: 500,
                        fontSize: 10, letterSpacing: 1,
                        textTransform: "uppercase", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {yearly.map((d, i) => (
                    <tr key={d.m} style={{
                      borderBottom: `1px solid ${COLORS.border}18`,
                      background: i % 2 === 0 ? `${COLORS.surface}80` : "transparent",
                    }}>
                      <td style={{ padding: "8px 10px", color: COLORS.accent, fontWeight: 500 }}>{d.ageFloor}</td>
                      <td style={{ padding: "8px 10px", color: COLORS.muted }}>{d.yr}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 500 }}>{money(d.savings)}</td>
                      <td style={{ padding: "8px 10px", color: COLORS.dim }}>{money(d.savingsInflow)}/mo</td>
                      <td style={{ padding: "8px 10px", color: d.debtBurden > 0 ? COLORS.red : COLORS.muted }}>
                        {d.debtBurden > 0 ? `−${money(d.debtBurden)}` : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: d.purchaseOutflow > 0 ? COLORS.orange : COLORS.muted }}>
                        {d.purchaseOutflow > 0 ? `−${money(d.purchaseOutflow)}` : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", fontSize: 10, color: COLORS.muted }}>
                        {d.activePurchases.length > 0 ? d.activePurchases.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </main>

        <footer style={{
          padding: "14px 18px 32px",
          borderTop: `1px solid ${COLORS.border}`,
          color: COLORS.muted, fontSize: 11, lineHeight: 2.0,
        }}>
          <strong style={{ color: COLORS.text }}>Model</strong> · Envelope = total
          discretionary cash per month. Debts and loan payments are outflows — when cleared
          they redirect to savings automatically. Down payments are deducted from savings at
          purchase. House purchases free your rent from purchase month forward (including after
          payoff); only the mortgage − rent delta actually affects your trajectory. Raises add
          net-of-tax income above your base salary on top of the envelope. Amortization and
          payoff dates use the closed-form logarithmic solution for accuracy.
        </footer>

      </div>
    </div>
  );
}
