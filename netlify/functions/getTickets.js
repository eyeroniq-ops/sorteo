import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore("raffle-comin");
    const tickets = (await store.get("tickets", { type: "json" })) || {};
    
    // We only send the reservation status, not personal data
    const publicTickets = {};
    for (let i = 1; i <= 100; i++) {
      if (tickets[i] && tickets[i].reserved) {
        publicTickets[i] = { reserved: true };
      } else {
        publicTickets[i] = { reserved: false };
      }
    }

    return new Response(JSON.stringify(publicTickets), {
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
  path: "/api/tickets"
};
