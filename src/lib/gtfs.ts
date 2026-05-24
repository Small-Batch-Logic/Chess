import JSZip from 'jszip';
import Papa from 'papaparse';

import type { LocalRouteIndex, Stop, StopRoute } from '../types';

type ParsedGtfs = {
  stops: Stop[];
  connections: Record<string, string[]>;
  stopRoutes: LocalRouteIndex;
};

const parseCsv = <T extends Record<string, string>>(content: string) =>
  Papa.parse<T>(content, { header: true, skipEmptyLines: true }).data;

export async function parseGtfsZip(file: File): Promise<ParsedGtfs> {
  const zip = await JSZip.loadAsync(file);

  const getFileContent = async (name: string) => {
    const archiveFile = zip.file(name) || zip.file(name.toLowerCase());
    return archiveFile ? archiveFile.async('text') : null;
  };

  const stopsContent = await getFileContent('stops.txt');
  const stopTimesContent = await getFileContent('stop_times.txt');
  const routesContent = await getFileContent('routes.txt');
  const tripsContent = await getFileContent('trips.txt');

  if (!stopsContent || !stopTimesContent) {
    throw new Error('Missing stops.txt or stop_times.txt');
  }

  const parsedStops = parseCsv<Record<string, string>>(stopsContent);
  const formattedStops: Stop[] = parsedStops
    .filter(stop => stop.stop_id && stop.stop_lat && stop.stop_lon)
    .map(stop => ({
      gtfs_stop_id: stop.stop_id,
      stop_name: stop.stop_name || stop.stop_id,
      stop_lat: parseFloat(stop.stop_lat),
      stop_lon: parseFloat(stop.stop_lon)
    }));

  if (formattedStops.length === 0) {
    throw new Error('No valid stops found in stops.txt. Ensure lat/lon fields are present.');
  }

  const parsedStopTimes = parseCsv<Record<string, string>>(stopTimesContent);
  const tripToStops: Record<string, string[]> = {};
  const stopToTrips: Record<string, string[]> = {};
  const stopToRouteIds: Record<string, Set<string>> = {};

  const routeIndex: Record<string, StopRoute> = {};
  if (routesContent) {
    parseCsv<Record<string, string>>(routesContent).forEach(route => {
      if (!route.route_id) return;
      routeIndex[route.route_id] = {
        route_short_name: route.route_short_name || route.route_id,
        route_long_name: route.route_long_name || route.route_short_name || route.route_id
      };
    });
  }

  const tripToRouteId: Record<string, string> = {};
  if (tripsContent) {
    parseCsv<Record<string, string>>(tripsContent).forEach(trip => {
      if (trip.trip_id && trip.route_id) {
        tripToRouteId[trip.trip_id] = trip.route_id;
      }
    });
  }

  parsedStopTimes.forEach(stopTime => {
    const tripId = stopTime.trip_id;
    const stopId = stopTime.stop_id;
    if (!tripId || !stopId) return;

    if (!tripToStops[tripId]) tripToStops[tripId] = [];
    tripToStops[tripId].push(stopId);

    if (!stopToTrips[stopId]) stopToTrips[stopId] = [];
    stopToTrips[stopId].push(tripId);

    const routeId = tripToRouteId[tripId];
    if (routeId) {
      if (!stopToRouteIds[stopId]) stopToRouteIds[stopId] = new Set<string>();
      stopToRouteIds[stopId].add(routeId);
    }
  });

  const connections: Record<string, string[]> = {};
  formattedStops.forEach(stop => {
    const trips = stopToTrips[stop.gtfs_stop_id] || [];
    const connectedSet = new Set<string>();

    trips.forEach(tripId => {
      (tripToStops[tripId] || []).forEach(otherStopId => {
        if (otherStopId !== stop.gtfs_stop_id) connectedSet.add(otherStopId);
      });
    });

    connections[stop.gtfs_stop_id] = Array.from(connectedSet);
  });

  const stopRoutes: LocalRouteIndex = {};
  Object.entries(stopToRouteIds).forEach(([stopId, routeIds]) => {
    stopRoutes[stopId] = Array.from(routeIds)
      .map(routeId => routeIndex[routeId])
      .filter((route): route is StopRoute => Boolean(route))
      .sort((a, b) => a.route_short_name.localeCompare(b.route_short_name));
  });

  return {
    stops: formattedStops,
    connections,
    stopRoutes
  };
}
