import InvestmentAdmin from "@/app/components/investment-admin";
import InvestmentProcess from "@/app/components/investment-process";

export default function InvestmentAdminPage() {
  return (
    <div className="space-y-6">
      <InvestmentAdmin />
      <InvestmentProcess defaultView="ADMIN" />
    </div>
  );
}
