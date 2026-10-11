// leaflet.heat attend un `L` global : ce module doit être importé avant lui.
import L from 'leaflet';
(window as any).L = L;
export default L;
