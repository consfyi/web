/// <reference types="@types/google.maps" />

import { Loader as GoogleMapsLoader } from "@googlemaps/js-api-loader";
import { Trans } from "@lingui/react/macro";
import {
  Anchor,
  Autocomplete,
  AutocompleteProps,
  Box,
  Input,
  InputWrapperProps,
  Loader,
  Text,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { hookifyPromise } from "~/hooks";
import IntlList from "./IntlList";
import { BasicMap, BasicMarker } from "./Map";
import { useLingui } from "@lingui/react";

export interface Place {
  location: string;
  country?: string;
  latLng?: [number, number];
}

const GOOGLE_MAPS_API_KEY = "AIzaSyCxfQTZl51y6J84T_pnxCA0nUUiqE1Pxmo";

const GOOGLE_MAPS_LOADER = new GoogleMapsLoader({
  apiKey: GOOGLE_MAPS_API_KEY,
});

const usePlacesLibrary = hookifyPromise(
  GOOGLE_MAPS_LOADER.importLibrary("places"),
);

const PERMITTED_ADDRESS_COMPONENTS = new Set([
  "locality",
  "administrative_area_level_1",
  "country",
]);

function formatAddress(
  displayName: string,
  components: google.maps.places.AddressComponent[],
) {
  return [
    displayName,
    ...components
      .filter((c) => c.types.some((t) => PERMITTED_ADDRESS_COMPONENTS.has(t)))
      .map((c) => c.longText),
  ].join(", ");
}

function formatPlace(place: Place) {
  if (place.latLng == null) {
    return place.location;
  }
  const [lat, lng] = place.latLng;
  return `${place.location} (${lat}, ${lng})`;
}

export default function PlacePicker({
  value,
  label,
  onChange,
  disabled,
  onClear,
  onBlur,
  leftSection,
  rightSection,
  clearable,
  error,
  ...props
}: {
  value: Place | null;
  onChange(value: Place | null): void;
} & Omit<
  AutocompleteProps,
  | "description"
  | "value"
  | "onChange"
  | "data"
  | "renderOption"
  | "filter"
  | "onOptionSubmit"
>) {
  const places = usePlacesLibrary();
  const { i18n } = useLingui();

  const [inputValue, setInputValue] = useState(() =>
    value != null ? formatPlace(value) : null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [retrieving, setRetrieving] = useState<boolean>(false);
  const [attributions, setAttributions] = useState<
    google.maps.places.Attribution[]
  >([]);

  const [options, setOptions] = useState<
    Record<string, google.maps.places.AutocompleteSuggestion>
  >({});

  const sessionToken = useMemo(
    () => new places.AutocompleteSessionToken(),
    [places],
  );

  const ref = useRef<HTMLInputElement | null>(null);
  const needsPredictionRef = useRef(false);

  const [viewState, setViewState] = useState(
    value == null || value.latLng == null
      ? {
          latitude: 0,
          longitude: 0,
          zoom: 0,
        }
      : { latitude: value.latLng[0], longitude: value.latLng[1], zoom: 17 },
  );

  const updatePredictions = useDebouncedCallback((v: string) => {
    (async () => {
      try {
        const resp =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: v,
            locationBias: { lat: viewState.latitude, lng: viewState.longitude },
            language: i18n.locale,
            sessionToken,
          });
        if (resp == null || !needsPredictionRef.current) {
          setOptions({});
          return;
        }
        const options: Record<
          string,
          google.maps.places.AutocompleteSuggestion
        > = {};
        for (const suggestion of resp.suggestions) {
          options[suggestion.placePrediction!.placeId] = suggestion;
        }
        setOptions(options);
      } finally {
        setLoading(false);
      }
    })();
  }, 1000);

  const setValue = useCallback(
    (v: Place | null) => {
      setOptions({});
      onChange(v);
      setInputValue(v != null ? formatPlace(v) : "");
      if (v == null) {
        setAttributions([]);
      }
    },
    [onChange],
  );

  return (
    <Input.Wrapper
      label={label}
      description={
        <Trans>
          Place search provided by Google Maps.{" "}
          {attributions.length > 0 ? (
            <Trans>
              Result provided by{" "}
              <IntlList
                items={attributions.map(({ provider, providerURI }) =>
                  providerURI != undefined ? (
                    <Anchor href={providerURI} target="_blank" key={provider}>
                      {provider}
                    </Anchor>
                  ) : (
                    <Fragment key={provider}>provider</Fragment>
                  ),
                )}
              />
              .
            </Trans>
          ) : null}
        </Trans>
      }
      error={error}
      {...(props as InputWrapperProps)}
    >
      <Box style={{ position: "relative" }} mt={4}>
        <BasicMap
          {...viewState}
          onMove={(evt) => {
            setViewState(evt.viewState);
          }}
          style={{
            height: "600px",
            borderRadius: "var(--mantine-radius-default)",
          }}
        >
          {value != null && value.latLng != null ? (
            <BasicMarker
              latitude={value.latLng[0]}
              longitude={value.latLng[1]}
              color="red"
              variant="filled"
            />
          ) : null}
        </BasicMap>
        <Box style={{ position: "absolute", top: 0, left: 0, width: "100%" }}>
          <Autocomplete
            {...props}
            type="search"
            m="xs"
            ref={ref}
            value={inputValue ?? undefined}
            data={Object.keys(options)}
            renderOption={({ option }) => {
              const suggestion = options[option.value];
              return (
                <Box>
                  <Text size="sm">
                    {suggestion.placePrediction!.mainText!.text}
                  </Text>
                  <Text size="xs">
                    {suggestion.placePrediction!.secondaryText != null
                      ? suggestion.placePrediction!.secondaryText.text
                      : null}
                  </Text>
                </Box>
              );
            }}
            error={error != null ? true : null}
            clearable={clearable}
            disabled={disabled || retrieving}
            leftSection={leftSection}
            rightSection={
              rightSection != null ? (
                <>
                  {loading || retrieving ? (
                    <Loader size="xs" color="dimmed" />
                  ) : null}
                  {rightSection}
                </>
              ) : loading || retrieving ? (
                <Loader size="xs" color="dimmed" />
              ) : null
            }
            filter={({ options }) => options}
            onChange={(v) => {
              if (document.activeElement !== ref.current) {
                return;
              }

              setInputValue(v);
              if (v == "") {
                return;
              }

              needsPredictionRef.current = true;
              setLoading(true);
              updatePredictions(v);
            }}
            onOptionSubmit={(v) => {
              const suggestion = options[v];
              setOptions({});
              ref.current!.blur();
              setInputValue(suggestion.placePrediction!.mainText!.text);
              setRetrieving(true);
              (async () => {
                try {
                  const place = new places.Place({
                    id: suggestion.placePrediction!.placeId,
                    requestedLanguage: "en",
                  });
                  await place.fetchFields({
                    fields: [
                      "displayName",
                      "location",
                      "addressComponents",
                      "attributions",
                    ],
                  });
                  const latLng = [
                    place.location!.lat(),
                    place.location!.lng(),
                  ] as [number, number];
                  const p = {
                    location: formatAddress(
                      place.displayName!,
                      place.addressComponents!,
                    ),
                    latLng,
                    country: place.addressComponents!.find((c) =>
                      c.types.includes("country"),
                    )!.shortText!,
                  };
                  setValue(p);
                  setViewState({
                    latitude: latLng[0],
                    longitude: latLng[1],
                    zoom: 17,
                  });
                  setAttributions(place.attributions!);
                } catch {
                  setInputValue("");
                }
                setRetrieving(false);
              })();
            }}
            onClear={() => {
              needsPredictionRef.current = false;
              setValue(null);
              if (onClear != null) {
                onClear();
              }
            }}
            onBlur={(e) => {
              needsPredictionRef.current = false;
              setOptions({});
              setInputValue(value != null ? formatPlace(value) : "");
              if (onBlur != null) {
                onBlur(e);
              }
            }}
          />
        </Box>
      </Box>
    </Input.Wrapper>
  );
}
