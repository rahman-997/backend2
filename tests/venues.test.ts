import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";
const venue={name:"Main Hall",address:"1 Example Street",capacity:500,contactEmail:"contact@example.com"};
describe("/v1/venues",()=>{
 it("creates a venue",async()=>{const r=await request(app).post("/v1/venues").send(venue);expect(r.status).toBe(201);expect(r.body.data).toMatchObject(venue);expect(r.body.data.id).toEqual(expect.any(String));});
 it("lists with pagination",async()=>{const s=crypto.randomUUID();await request(app).post("/v1/venues").send({...venue,name:`A-${s}`});await request(app).post("/v1/venues").send({...venue,name:`B-${s}`});const r=await request(app).get("/v1/venues?page=1&limit=1");expect(r.status).toBe(200);expect(r.body.data).toHaveLength(1);expect(r.body.pagination.page).toBe(1);});
 it("searches and filters",async()=>{const s=crypto.randomUUID();await request(app).post("/v1/venues").send({...venue,name:`Search-${s}`,capacity:2000});const r=await request(app).get(`/v1/venues?search=${s}&minCapacity=1000`);expect(r.status).toBe(200);expect(r.body.data).toHaveLength(1);});
 it("gets by id",async()=>{const c=await request(app).post("/v1/venues").send({...venue,name:`Get-${crypto.randomUUID()}`});const r=await request(app).get(`/v1/venues/${c.body.data.id}`);expect(r.status).toBe(200);});
 it("returns 404",async()=>{const r=await request(app).get(`/v1/venues/${crypto.randomUUID()}`);expect(r.status).toBe(404);});
 it("patches",async()=>{const c=await request(app).post("/v1/venues").send({...venue,name:`Patch-${crypto.randomUUID()}`});const r=await request(app).patch(`/v1/venues/${c.body.data.id}`).send({capacity:750});expect(r.status).toBe(200);expect(r.body.data.capacity).toBe(750);});
 it("deletes",async()=>{const c=await request(app).post("/v1/venues").send({...venue,name:`Delete-${crypto.randomUUID()}`});expect((await request(app).delete(`/v1/venues/${c.body.data.id}`)).status).toBe(204);expect((await request(app).get(`/v1/venues/${c.body.data.id}`)).status).toBe(404);});
 it("rejects duplicate names",async()=>{const name=`Duplicate-${crypto.randomUUID()}`;await request(app).post("/v1/venues").send({...venue,name});const r=await request(app).post("/v1/venues").send({...venue,name});expect(r.status).toBe(409);});
 it("rejects invalid input",async()=>{const r=await request(app).post("/v1/venues").send({...venue,capacity:0,contactEmail:"bad"});expect(r.status).toBe(400);});
 it("rejects empty patch",async()=>{const c=await request(app).post("/v1/venues").send({...venue,name:`Empty-${crypto.randomUUID()}`});const r=await request(app).patch(`/v1/venues/${c.body.data.id}`).send({});expect(r.status).toBe(400);});
 it("rejects invalid capacity range",async()=>{const r=await request(app).get("/v1/venues?minCapacity=500&maxCapacity=100");expect(r.status).toBe(400);});
});
