import type { Request, Response } from "express";
import { venueService } from "./venue.service.js";
export const createVenue=async(req:Request,res:Response)=>{res.status(201).json({data:await venueService.create(req.body)});};
export const listVenues=async(req:Request,res:Response)=>{const q=req.query as unknown as {page:number;limit:number;search?:string;minCapacity?:number;maxCapacity?:number};const result=await venueService.list(q);const totalPages=Math.ceil(result.total/q.limit);res.status(200).json({data:result.data,pagination:{page:q.page,limit:q.limit,total:result.total,totalPages,hasNextPage:q.page<totalPages,hasPreviousPage:q.page>1}});};
export const getVenue=async(req:Request,res:Response)=>{res.status(200).json({data:await venueService.getById(req.params.id)});};
export const updateVenue=async(req:Request,res:Response)=>{res.status(200).json({data:await venueService.update(req.params.id,req.body)});};
export const deleteVenue=async(req:Request,res:Response)=>{await venueService.delete(req.params.id);res.status(204).send();};
