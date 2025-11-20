import React from "react";
import { ReactQueryProvider } from "../ReactQueryProvider";
import SeatingPlanPage from "./SeatingPlanPage";

export default function SeatingPlanPageWithProvider({ eventId }: { eventId: string }) {
  return (
    <ReactQueryProvider>
      <SeatingPlanPage eventId={eventId} />
    </ReactQueryProvider>
  );
}
