import React, { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { heroSlides } from "@/config/heroSlides";

const AUTOPLAY_MS = 4500;

/**
 * DealLakay homepage Hero slider — reuses the project's existing Carousel
 * (embla-carousel-react under components/ui/carousel.jsx) rather than
 * introducing a new carousel library. Slides are defined in
 * src/config/heroSlides.js — add or remove an entry there to change what
 * shows here; nothing in this component needs editing for that.
 *
 * Autoplay is implemented manually (no embla-carousel-autoplay dependency
 * exists in this project yet): we grab the embla API instance via the
 * existing `setApi` prop and advance it on an interval.
 */
export default function HeroSlider() {
  const [api, setApi] = useState(null);

  useEffect(() => {
    if (!api) return;
    const id = setInterval(() => {
      api.scrollNext();
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      className="w-full max-w-md mx-auto lg:mx-0"
      data-testid="hero-slider"
    >
      <CarouselContent>
        {heroSlides.map((slide) => (
          <CarouselItem key={slide.src}>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-lg border border-border">
              <img
                src={slide.src}
                alt={slide.city}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
                <p className="text-white font-display font-bold text-lg leading-tight">{slide.city}</p>
                <p className="text-white/85 text-sm">{slide.caption}</p>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
