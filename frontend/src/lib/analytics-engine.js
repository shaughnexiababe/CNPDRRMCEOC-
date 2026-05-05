/**
 * CN-PDRRMO Analytics Engine
 * Implements Predictive and Prescriptive logic for Camarines Norte
 */

import { MUNICIPALITY_DATA, MUNICIPALITIES } from './constants';

/**
 * PREDICTIVE ANALYTICS
 * Predicts potential hazard impacts based on forecast parameters
 */
export const predictHazardImpact = (forecast) => {
  const { rainfall24h, windSpeedKph, tideLevelMeters } = forecast;

  const predictions = MUNICIPALITIES.map(muniName => {
    const baseline = MUNICIPALITY_DATA[muniName];
    if (!baseline) return null;

    let floodProb = 0;
    let landslideProb = 0;
    let surgeProb = 0;

    // 1. Flood Prediction (Rainfall + Baseline Susceptibility)
    // Threshold: 100mm/24h triggers "High" risk in susceptible areas
    const rainFactor = Math.min(rainfall24h / 150, 1.2);
    const floodSuscMult = { 'very_high': 1.0, 'high': 0.8, 'medium': 0.5, 'low': 0.2, 'none': 0 }[baseline.hazards.flood] || 0.5;
    floodProb = rainFactor * floodSuscMult * 100;

    // 2. Landslide Prediction (Heavy Rain + Slope/Baseline)
    landslideProb = rainFactor * ({ 'very_high': 1.0, 'high': 0.8, 'medium': 0.4, 'low': 0.1, 'none': 0 }[baseline.hazards.landslide] || 0.4) * 100;

    // 3. Storm Surge (Wind Speed + Tide + Coastal Baseline)
    const windFactor = Math.min(windSpeedKph / 200, 1.0);
    const tideFactor = Math.min(tideLevelMeters / 3.0, 1.0);
    const surgeSusc = baseline.hazards.storm_surge !== 'none' ? 1.0 : 0;
    surgeProb = (windFactor + tideFactor) / 2 * surgeSusc * 100;

    const maxRisk = Math.max(floodProb, landslideProb, surgeProb);
    let severity = 'low';
    if (maxRisk > 80) severity = 'very_high';
    else if (maxRisk > 60) severity = 'high';
    else if (maxRisk > 30) severity = 'moderate';

    return {
      municipality: muniName,
      impactScore: Math.round(maxRisk),
      severity,
      primaryThreat: floodProb >= landslideProb && floodProb >= surgeProb ? 'Flood' : (landslideProb >= surgeProb ? 'Landslide' : 'Storm Surge'),
      exposedPopulation: Math.round(baseline.population * (maxRisk / 100) * 0.4) // PDC Baseline: ~40% of pop in specific risk areas
    };
  }).filter(p => p !== null);

  return predictions.sort((a, b) => b.impactScore - a.impactScore);
};

/**
 * PRESCRIPTIVE ANALYTICS
 * Recommends early actions based on predicted impact
 */
export const prescribeEarlyActions = (prediction) => {
  const actions = [];

  prediction.forEach(p => {
    if (p.severity === 'very_high' || p.severity === 'high') {
      actions.push({
        municipality: p.municipality,
        priority: 'critical',
        recommendation: `MANDATORY EVACUATION: Predicted ${p.primaryThreat} impact score ${p.impactScore} is above critical threshold.`,
        resources: 'Dispatch trucks, Pre-position SAR teams at local bridges.'
      });
    } else if (p.severity === 'moderate') {
      actions.push({
        municipality: p.municipality,
        priority: 'high',
        recommendation: `ADVISORY: Monitor ${p.primaryThreat} levels. Alert MDRRMO for possible pre-emptive evacuation.`,
        resources: 'Pre-position Family Food Packs at designated regional hubs.'
      });
    }
  });

  return actions;
};

/**
 * Real-time Data Endpoints for Camarines Norte
 */
export const ANALYTICS_DATA_SOURCES = [
  { name: "PAGASA Daet Station (5014)", type: "Synoptic", info: "Rainfall/Wind Monitoring" },
  { name: "DOST Daet Bridge WLMS", type: "Water Level", info: "Riverine Monitoring" },
  { name: "DOST Labo Bridge WLMS", type: "Water Level", info: "Riverine Monitoring" },
  { name: "DOST Jose Panganiban ARG", type: "Rainfall", info: "Precipitation Monitoring" },
  { name: "PSA 2020 Census", type: "Demographics", info: "Exposure Baseline" }
];
