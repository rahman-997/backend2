import type { RequestHandler, Response } from "express";
import * as authService from "./auth.service.js";

const COOKIE_NAME = "refresh_token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/v1/auth/refresh",
    maxAge: COOKIE_MAX_AGE,
  });
}

export const signup: RequestHandler = async (req, res) => {
  const result = await authService.signup(req.body);
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json({ accessToken: result.accessToken, user: result.user });
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken, user: result.user });
};

export const refresh: RequestHandler = async (req, res) => {
  const result = await authService.refresh(req.cookies?.[COOKIE_NAME]);
  setRefreshCookie(res, result.refreshToken);
  res.json({ accessToken: result.accessToken });
};
