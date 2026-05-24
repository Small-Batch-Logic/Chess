import type { Stop, StopRoute, LocalRouteIndex } from '../types';

export const DEMO_STOPS: Stop[] = [
  { gtfs_stop_id: 's1', stop_name: 'Downtown Transit Center', stop_lat: 47.6588, stop_lon: -117.4260 },
  { gtfs_stop_id: 's2', stop_name: 'North Hill Hub', stop_lat: 47.6800, stop_lon: -117.4200 },
  { gtfs_stop_id: 's3', stop_name: 'South Hill Plaza', stop_lat: 47.6350, stop_lon: -117.4100 },
  { gtfs_stop_id: 's4', stop_name: 'East Valley Station', stop_lat: 47.6650, stop_lon: -117.3800 },
  { gtfs_stop_id: 's5', stop_name: 'West Heights Terminal', stop_lat: 47.6500, stop_lon: -117.4600 },
  { gtfs_stop_id: 's6', stop_name: 'Riverfront Park', stop_lat: 47.6620, stop_lon: -117.4220 },
  { gtfs_stop_id: 's7', stop_name: 'Medical District', stop_lat: 47.6450, stop_lon: -117.4280 },
  { gtfs_stop_id: 's8', stop_name: 'University Village', stop_lat: 47.6680, stop_lon: -117.4050 },
  { gtfs_stop_id: 's9', stop_name: 'Airport Link Hub', stop_lat: 47.6200, stop_lon: -117.5100 },
  { gtfs_stop_id: 's10', stop_name: 'Northwest Transit Mall', stop_lat: 47.7100, stop_lon: -117.4500 }
];

export const DEMO_CONNECTIONS: Record<string, string[]> = {
  's1': ['s6', 's7', 's8', 's4', 's5'],
  's2': ['s6', 's8', 's10'],
  's3': ['s7', 's9'],
  's4': ['s1', 's8'],
  's5': ['s1', 's7'],
  's6': ['s1', 's2'],
  's7': ['s1', 's3', 's5'],
  's8': ['s1', 's2', 's4'],
  's9': ['s3'],
  's10': ['s2']
};

export const DEMO_ROUTES: LocalRouteIndex = {
  's1': [{ route_short_name: '10', route_long_name: 'City Loop' }, { route_short_name: 'EX', route_long_name: 'Express Link' }],
  's2': [{ route_short_name: '20', route_long_name: 'North Rider' }],
  's3': [{ route_short_name: '30', route_long_name: 'South Shuttle' }],
  's4': [{ route_short_name: '40', route_long_name: 'Valley Connect' }],
  's5': [{ route_short_name: '50', route_long_name: 'Heights Express' }],
  's6': [{ route_short_name: '10', route_long_name: 'City Loop' }],
  's7': [{ route_short_name: '70', route_long_name: 'Med Line' }],
  's8': [{ route_short_name: '80', route_long_name: 'Campus Link' }],
  's9': [{ route_short_name: 'EX', route_long_name: 'Express Link' }],
  's10': [{ route_short_name: '20', route_long_name: 'North Rider' }]
};
