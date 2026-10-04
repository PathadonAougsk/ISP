"use client";

import { getTickets, type Ticket } from "@/lib/ticket";
import { useEffect, useState } from "react";

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    getTickets().then((body) => {
      setTickets(body.Tickets);
      console.log(body.Tickets);
    });
  }, []);

  return <div></div>;
}
