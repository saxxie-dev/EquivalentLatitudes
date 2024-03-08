const topReferenceYr = 0.160875;
const topReferenceLatitude = 71.29;
const bottomReferenceYr = 0.983905;
const bottomReferenceLatitude = 7.208;

const deltaYr = bottomReferenceYr - topReferenceYr;
const deltaLatitude = bottomReferenceLatitude - topReferenceLatitude;

const leftReferenceXr = .002436;
const leftReferenceLongitude = -168.101;
const rightReferenceXr = .986429;
const rightReferenceLongitude = -11.313;

const deltaXr = rightReferenceXr - leftReferenceXr;
const deltaLongitude = rightReferenceLongitude - leftReferenceLongitude;

export const yrToLat = (yr) => {
  return topReferenceLatitude + deltaLatitude / deltaYr * (yr - topReferenceYr);
};
export const latToYr = (lat) => {
  return topReferenceYr + deltaYr / deltaLatitude * (lat - topReferenceLatitude);
};
export const xrToLong = (xr) => {
  return leftReferenceLongitude + deltaLongitude / deltaXr * (xr - leftReferenceXr);
};
export const longToXr = (long) => {
  return leftReferenceXr + deltaXr / deltaLongitude * (long - leftReferenceLongitude);
};
