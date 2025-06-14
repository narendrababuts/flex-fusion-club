
type Plan = { id: string; name: string; price: number; duration_days: number };
export default function PlanPicker({ plans, selectedPlan, onSelect }: { plans: Plan[]; selectedPlan: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="font-semibold mb-2">Select a Plan</label>
      {plans.map(plan => (
        <button
          key={plan.id}
          className={`border flex items-center justify-between rounded p-3 text-left transition ${selectedPlan === plan.id ? "bg-primary text-white" : "hover:bg-muted"}`}
          onClick={() => onSelect(plan.id)}
          type="button"
        >
          <span>
            <span className="font-medium">{plan.name}</span>{" "}
            <span className="text-sm text-muted-foreground">({plan.duration_days} days)</span>
          </span>
          <span className="font-bold">{plan.price.toLocaleString("en", { style: "currency", currency: "USD" })}</span>
        </button>
      ))}
    </div>
  );
}
