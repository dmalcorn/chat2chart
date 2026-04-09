import { z } from 'zod/v4';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const sendMessageSchema = z.object({
  message: z.string().trim().min(1).max(5000),
});

export type SendMessageRequest = z.infer<typeof sendMessageSchema>;
