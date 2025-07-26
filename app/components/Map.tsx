import { match } from "@formatjs/intl-localematcher";
import { useLingui } from "@lingui/react/macro";
import {
  Box,
  CloseButton,
  Flex,
  Indicator,
  MantineColor,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import {
  language_script_pairs,
  layers,
  namedFlavor,
} from "@protomaps/basemaps";
import { IconMapPinFilled } from "@tabler/icons-react";
import {
  AttributionControl,
  Map as Maplibre,
  Marker,
  MarkerProps,
  Popup,
  StyleSpecification,
  useMap,
} from "@vis.gl/react-maplibre";
import "maplibre-theme/icons.default.css";
import "maplibre-theme/modern.css";
import { MaplibreProps } from "node_modules/@vis.gl/react-maplibre/dist/maplibre/maplibre";
import { CSSProperties, ReactNode, useMemo } from "react";
import absurd from "~/absurd";
import classes from "./Map.module.css";

const API_KEY = "a4d6fb59d9d6e179";

const SUPPORTED_LANGUAGES = language_script_pairs.map((v) => v.lang);

function makeStyle({
  colorScheme,
  locale,
}: {
  colorScheme: "light" | "dark";
  locale: string;
}): StyleSpecification {
  const flavorName =
    colorScheme == "light"
      ? "light"
      : colorScheme == "dark"
        ? "dark"
        : absurd<string>(colorScheme);
  return {
    version: 8,
    sources: {
      protomaps: {
        type: "vector",
        url: `https://api.protomaps.com/tiles/v4.json?key=${API_KEY}`,
        attribution:
          '<a href="https://openstreetmap.org/copyright" target="_blank">© OpenStreetMap Contributors</a>',
      },
    },
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${flavorName}`,
    layers: layers("protomaps", namedFlavor(flavorName), {
      lang: match([locale], SUPPORTED_LANGUAGES, "en"),
    }),

    transition: { duration: 0, delay: 0 },
  };
}

export function useMapStyle() {
  const colorScheme = useComputedColorScheme();
  const { i18n, t } = useLingui();

  return useMemo(
    () => makeStyle({ colorScheme, locale: i18n.locale }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colorScheme, t],
  );
}

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  variant: string;
  color: MantineColor;
  active: boolean;
  zIndex: number;
  popup?: ReactNode;
}

export function BasicMarker({
  active = false,
  variant = "default",
  color,
  ...props
}: { active?: boolean; variant?: string; color: MantineColor } & MarkerProps) {
  const theme = useMantineTheme();

  const colors = theme.variantColorResolver({
    theme,
    color,
    variant,
  });

  return (
    <Marker {...props} subpixelPositioning>
      <Box style={{ marginTop: "-100%" }}>
        <Indicator
          position="top-start"
          color="green"
          processing
          size={12}
          withBorder
          disabled={!active}
          zIndex={2}
          offset={6}
        >
          <IconMapPinFilled
            size={32}
            color={
              variant == "light"
                ? `color-mix(in srgb, var(--mantine-color-${color}-filled), var(--mantine-color-body) 90%)`
                : colors.background
            }
            style={{
              stroke: colors.color,
            }}
          />
        </Indicator>
      </Box>
    </Marker>
  );
}

function MarkerWithPopup({
  pin,
  showPopup,
  setShowPopup,
}: {
  pin: Pin;
  showPopup: boolean;
  setShowPopup: (v: boolean) => void;
}) {
  const mapRef = useMap();

  return (
    <>
      <BasicMarker
        latitude={pin.lat}
        longitude={pin.lng}
        onClick={(e) => {
          e.originalEvent.stopPropagation();
          if (mapRef.current != null && showPopup) {
            mapRef.current.flyTo({ center: [pin.lng, pin.lat] });
          }
          setShowPopup(true);
        }}
        active={pin.active}
        color={pin.color}
        variant={pin.variant}
        style={{
          zIndex: pin.zIndex,
        }}
      />
      {showPopup && pin.popup != null ? (
        <Popup
          closeButton={false}
          closeOnClick={false}
          focusAfterOpen={false}
          maxWidth="none"
          latitude={pin.lat}
          longitude={pin.lng}
          style={{ zIndex: 100 }}
        >
          <Flex gap="xs">
            {pin.popup}
            <CloseButton
              onClick={() => {
                setShowPopup(false);
              }}
            />
          </Flex>
        </Popup>
      ) : null}
    </>
  );
}

export function BasicMap({
  children,
  className,
  style,
  mapStyle,
  ...props
}: { children?: ReactNode; className?: string; style?: CSSProperties } & Omit<
  MaplibreProps,
  "attributionControl"
>) {
  const colorScheme = useComputedColorScheme();
  const defaultMapStyle = useMapStyle();

  return (
    <div
      className={`${className ?? ""} ${colorScheme} ${classes.map}`}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      <Maplibre
        {...props}
        ref={(ref) => {
          if (ref == null) {
            return;
          }
          const map = ref.getMap();
          map.dragRotate.disable();
          map.touchPitch.disable();
          map.touchZoomRotate.disableRotation();
          map.keyboard.disableRotation();
        }}
        attributionControl={false}
        mapStyle={mapStyle != undefined ? mapStyle : defaultMapStyle}
      >
        <AttributionControl compact={false} />
        {children}
      </Maplibre>
    </div>
  );
}

export default function Map({
  pins,
  style,
  initialCenter,
  setCenter,
  selected,
  setSelected,
}: {
  pins: Pin[];
  style: CSSProperties;
  initialCenter: { lat: number; lng: number; zoom: number };
  setCenter(center: { lat: number; lng: number; zoom: number }): void;
  selected: string | null;
  setSelected(selected: string | null): void;
}) {
  return (
    <BasicMap
      style={style}
      onMoveEnd={(e) => {
        setCenter({
          lat: e.viewState.latitude,
          lng: e.viewState.longitude,
          zoom: e.viewState.zoom,
        });
      }}
      onClick={() => {
        setSelected(null);
      }}
      initialViewState={{
        latitude: initialCenter.lat,
        longitude: initialCenter.lng,
        zoom: initialCenter.zoom,
      }}
    >
      {pins.map((pin, i) => (
        <MarkerWithPopup
          key={i}
          pin={pin}
          showPopup={pin.id == selected}
          setShowPopup={(v) => {
            setSelected(v ? pin.id : null);
          }}
        />
      ))}
    </BasicMap>
  );
}
