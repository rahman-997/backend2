import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import type { AuthPrincipal } from "./auth.types.js";

export async function register(req: Request, res: Response): Promise<void> {
  res.status(201).json({ data: await authService.register(req.body) });
}

export async function login(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await authService.login(req.body) });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await authService.refresh(req.body.refreshToken) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
}

export async function logoutAll(_req: Request, res: Response): Promise<void> {
  const principal = res.locals.auth as AuthPrincipal;
  await authService.logoutAll(principal.userId);
  res.status(204).send();
}

export async function me(_req: Request, res: Response): Promise<void> {
  const principal = res.locals.auth as AuthPrincipal;
  res.status(200).json({ data: await authService.me(principal.userId) });
}

export async function listUsers(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await authService.listUsers() });
}

export async function updateUserRole(_req: Request, res: Response): Promise<void> {
  const principal = res.locals.auth as AuthPrincipal;
  const { id } = res.locals.validatedParams as { id: string };
  res.status(200).json({ data: await authService.updateUserRole(principal.userId, id, res.req.body.role) });
}

export async function updateUserStatus(_req: Request, res: Response): Promise<void> {
  const principal = res.locals.auth as AuthPrincipal;
  const { id } = res.locals.validatedParams as { id: string };
  res.status(200).json({ data: await authService.updateUserStatus(principal.userId, id, res.req.body.isActive) });
}
