import type { Metadata } from "next"

import { StatsDashboard } from "@/components/stats-dashboard"

export const metadata: Metadata = {
  title: "Estatísticas",
}

export default function EstatisticasPage() {
  return <StatsDashboard />
}
