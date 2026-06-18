import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { ticketId, name, whatsapp } = body;

    if (!ticketId || !name || !whatsapp) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (ticketId < 1 || ticketId > 100) {
      return new Response(JSON.stringify({ error: "Invalid ticket number" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = getStore("raffle-comin");
    const tickets = (await store.get("tickets", { type: "json" })) || {};

    if (tickets[ticketId] && tickets[ticketId].reserved) {
      return new Response(JSON.stringify({ error: "Ticket already reserved" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Reserve it
    tickets[ticketId] = {
      reserved: true,
      name,
      whatsapp,
      timestamp: Date.now()
    };

    await store.setJSON("tickets", tickets);

    return new Response(JSON.stringify({ success: true, ticketId }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export const config = {
  path: "/api/reserve"
};
