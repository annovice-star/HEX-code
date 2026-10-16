"use client";
import { assetHref } from "../lib/client-runtime";

export default function CompanyBrand(){
  return <span className="company-brand"><img className="company-logo" src={assetHref("hex-cubes-logo.png")} alt="立方匯 HEX CUBES" width={220} height={60}/><span className="company-edition">APEC SPECIAL</span></span>;
}
