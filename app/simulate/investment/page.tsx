import InvestmentSimulator from "@/app/components/investment-simulator";
import InvestmentProcess from "@/app/components/investment-process";

export default function InvestmentSimulationPage() {
  return (
    <div className="space-y-6">
      <InvestmentSimulator />
      <InvestmentProcess defaultView="CLIENT" />
    </div>
  );
}
