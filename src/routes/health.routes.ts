import { Router } from "express";
import { venueService } from "../modules/venues/venue.service.js";
const router=Router();
router.get("/health",(_req,res)=>res.status(200).json({status:"ok"}));
router.get("/ready",async(_req,res)=>{try{await venueService.health();res.status(200).json({status:"ready"});}catch{res.status(503).json({status:"not_ready"});}});
export default router;
