import type { Concentration, StockStatus } from './domain';

export type ImageInfo = {
  id: string;
  alt: string;
  width: number;
  height: number;
  widths: number[];
};

export type PerfumeCard = {
  id: number;
  slug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  concentration: Concentration;
  stockStatus: StockStatus;
  minPriceKurus: number | null;
  cover: ImageInfo | null;
};
