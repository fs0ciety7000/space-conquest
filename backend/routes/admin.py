from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Planet
from auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])

class PlanetUpdate(BaseModel):
    # Ressources
    metal_amount: Optional[int] = None
    crystal_amount: Optional[int] = None
    deuterium_amount: Optional[int] = None
    
    # Mines
    metal_mine_level: Optional[int] = None
    crystal_mine_level: Optional[int] = None
    deuterium_mine_level: Optional[int] = None
    solar_plant_level: Optional[int] = None
    
    # Installations
    shipyard_level: Optional[int] = None
    research_level: Optional[int] = None
    hangar_level: Optional[int] = None
    
    # Technologies
    energy_tech_level: Optional[int] = None
    laser_battery_level: Optional[int] = None
    armour_tech_level: Optional[int] = None
    espionage_tech_level: Optional[int] = None
    
    # Flotte
    light_hunter_count: Optional[int] = None
    cruiser_count: Optional[int] = None
    recycler_count: Optional[int] = None
    spy_probe_count: Optional[int] = None
    colony_ship_count: Optional[int] = None
    transporter_count: Optional[int] = None
    
    # Défenses
    missile_launcher_count: Optional[int] = None
    plasma_turret_count: Optional[int] = None

def require_admin(current_user: User = Depends(get_current_user)):
    """Vérifie que l'utilisateur est admin (phantomhex)"""
    if current_user.username != "phantomhex":
        raise HTTPException(status_code=403, detail="Accès interdit")
    return current_user

@router.get("/players")
def get_all_players(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Liste tous les joueurs avec leurs planètes"""
    users = db.query(User).all()
    result = []
    
    for user in users:
        planet = db.query(Planet).filter(Planet.owner_id == user.id).first()
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "planet_id": planet.id if planet else None,
            "planet_name": planet.name if planet else "Aucune",
            "total_points": planet.total_points if planet else 0
        })
    
    return result

@router.get("/planet/{planet_id}")
def get_planet_admin(planet_id: str, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Récupère toutes les données d'une planète"""
    planet = db.query(Planet).filter(Planet.id == planet_id).first()
    if not planet:
        raise HTTPException(status_code=404, detail="Planète introuvable")
    
    return {
        "id": planet.id,
        "owner_id": planet.owner_id,
        "name": planet.name,
        "galaxy": planet.galaxy,
        "system": planet.system,
        "position": planet.position,
        
        # Ressources
        "metal_amount": planet.metal_amount,
        "crystal_amount": planet.crystal_amount,
        "deuterium_amount": planet.deuterium_amount,
        "last_update": planet.last_update.isoformat(),
        
        # Mines
        "metal_mine_level": planet.metal_mine_level,
        "crystal_mine_level": planet.crystal_mine_level,
        "deuterium_mine_level": planet.deuterium_mine_level,
        "solar_plant_level": planet.solar_plant_level,
        
        # Installations
        "shipyard_level": planet.shipyard_level,
        "research_level": planet.research_level,
        "hangar_level": planet.hangar_level,
        
        # Technologies
        "energy_tech_level": planet.energy_tech_level,
        "laser_battery_level": planet.laser_battery_level,
        "armour_tech_level": planet.armour_tech_level,
        "espionage_tech_level": planet.espionage_tech_level,
        
        # Flotte
        "light_hunter_count": planet.light_hunter_count,
        "cruiser_count": planet.cruiser_count,
        "recycler_count": planet.recycler_count,
        "spy_probe_count": planet.spy_probe_count,
        "colony_ship_count": planet.colony_ship_count,
        "transporter_count": planet.transporter_count,
        
        # Défenses
        "missile_launcher_count": planet.missile_launcher_count,
        "plasma_turret_count": planet.plasma_turret_count,
    }

@router.patch("/planet/{planet_id}")
def update_planet_admin(
    planet_id: str, 
    updates: PlanetUpdate,
    db: Session = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    """Met à jour une planète (ADMIN ONLY)"""
    planet = db.query(Planet).filter(Planet.id == planet_id).first()
    if not planet:
        raise HTTPException(status_code=404, detail="Planète introuvable")
    
    # Appliquer les modifications
    update_data = updates.dict(exclude_unset=True)
    
    # ⚠️ IMPORTANT : Si on modifie les ressources, on met à jour last_update
    resource_fields = ['metal_amount', 'crystal_amount', 'deuterium_amount']
    if any(field in update_data for field in resource_fields):
        planet.last_update = datetime.utcnow()
    
    for key, value in update_data.items():
        if value is not None:
            setattr(planet, key, value)
    
    db.commit()
    db.refresh(planet)
    
    return {"success": True, "message": "Planète mise à jour", "last_update": planet.last_update.isoformat()}
