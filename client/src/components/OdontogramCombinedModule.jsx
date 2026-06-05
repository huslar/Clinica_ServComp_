import React from "react";
import { OdontogramModule } from "./OdontogramModule";

export function OdontogramCombinedModule({ onNotify }) {
  return <OdontogramModule onNotify={onNotify} combinedMode />;
}
