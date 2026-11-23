import { z } from "zod";

export const remindersResponse = z.object({ sent: z.int().nonnegative() });

export const examples = {
  valid: [{ sent: 0 }, { sent: 3 }],
  invalid: [{}, { sent: -1 }, { sent: "2" }],
};
