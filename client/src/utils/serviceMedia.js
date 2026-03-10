import { getAssetUrl } from './url';

const VIDEO_ASSET_PATTERN = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?.*)?$/i;

const dedupeMedia = (items) => [...new Set(
  items
    .map((item) => String(item || '').trim())
    .filter(Boolean)
)];

export const isVideoAsset = (value = '') => VIDEO_ASSET_PATTERN.test(String(value).split('#')[0]);

export const resolveServiceMediaAsset = (value) => getAssetUrl(value);

export const getServiceMediaList = (service) => dedupeMedia([
  service?.image,
  ...(Array.isArray(service?.media) ? service.media : [])
]);

export const getServiceAdditionalMediaList = (service) => dedupeMedia(
  (Array.isArray(service?.media) ? service.media : []).filter((item) => item !== service?.image)
);
