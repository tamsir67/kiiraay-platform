// Coordonnées approximatives réalistes des polygones communaux de Guédiawaye

export interface CommuneGeo {
  id: string;
  nom: string;
  couleur: string;
  coordonnees: [number, number][]; // Polygone [lat, lng]
}

export const COMMUNES_POLYGONS: CommuneGeo[] = [
  {
    id: 'golf-sud',
    nom: 'Golf Sud',
    couleur: '#059669',
    coordonnees: [
      [14.7890, -17.4220],
      [14.7860, -17.4010],
      [14.7760, -17.4030],
      [14.7710, -17.4150],
      [14.7760, -17.4250]
    ]
  },
  {
    id: 'sam-notaire',
    nom: 'Sam Notaire',
    couleur: '#ea580c',
    coordonnees: [
      [14.7735, -17.4230],
      [14.7710, -17.4090],
      [14.7630, -17.4110],
      [14.7620, -17.4210],
      [14.7690, -17.4260]
    ]
  },
  {
    id: 'ndiareme-limamoulaye',
    nom: 'Ndiarème Limamoulaye',
    couleur: '#7c3aed',
    coordonnees: [
      [14.7800, -17.4040],
      [14.7730, -17.3920],
      [14.7660, -17.3970],
      [14.7710, -17.4080]
    ]
  },
  {
    id: 'medina-gounass',
    nom: 'Médina Gounass',
    couleur: '#0284c7',
    coordonnees: [
      [14.7680, -17.3940],
      [14.7630, -17.3780],
      [14.7580, -17.3860],
      [14.7630, -17.3980]
    ]
  },
  {
    id: 'wakhinane-nimzatt',
    nom: 'Wakhinane Nimzatt',
    couleur: '#b45309',
    coordonnees: [
      [14.7920, -17.3950],
      [14.7840, -17.3680],
      [14.7710, -17.3710],
      [14.7740, -17.3890],
      [14.7830, -17.3980]
    ]
  }
];
