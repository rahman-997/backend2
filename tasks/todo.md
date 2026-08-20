# Session 4 plan

- [x] Add signup, login and refresh endpoints with rate limiting on /v1/auth.
- [x] Sign and verify HS256 access JWTs with sub + role claims and a 15-minute lifetime.
- [x] Store only SHA-256 refresh-token hashes and rotate tokens atomically.
- [x] Apply route authentication and role policy to every Eventify endpoint.
- [x] Enforce event ownership and booking ownership in the service layer.
- [x] Add a second seeded organizer and a Supertest ownership regression test.
- [x] Keep response DTOs explicit so passwordHash never crosses the wire.
