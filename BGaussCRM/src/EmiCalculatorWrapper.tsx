import { useParams, useLocation } from "react-router-dom";
import EmiCalculator from "./EmiCalculator";

function EmiCalculatorWrapper() {
  const { id } = useParams();
  const location = useLocation();

  const state = location.state as {
    modelName: string;
    variantName: string;
    basePrice: number | null;
  };

  return (
    <EmiCalculator
      scootyId={Number(id)}
      modelName={state?.modelName || ""}
      variantName={state?.variantName || ""}
      basePrice={state?.basePrice ?? 0}
    />
  );
}

export default EmiCalculatorWrapper;