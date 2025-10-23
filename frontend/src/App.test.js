import { render, screen } from "@testing-library/react";
import axios from "axios";
import App from "./App";

jest.mock("axios", () => {
  const mockGet = jest.fn();
  const instance = { get: mockGet };
  const mockAxios = {
    create: jest.fn(() => instance),
    isCancel: jest.fn(() => false),
    __instance: instance,
    __get: mockGet,
  };
  return {
    __esModule: true,
    default: mockAxios,
  };
});

beforeEach(() => {
  axios.__get.mockReset();
  axios.create.mockReturnValue(axios.__instance);

  const sampleWeather = {
    name: "Córdoba",
    weather: [{ main: "Clear", description: "cielo despejado" }],
    main: { temp: 23.4, feels_like: 22.1, humidity: 55 },
    wind: { speed: 3.6 },
    coord: { lat: -31.4, lon: -64.2 },
    sys: { country: "AR" },
  };

  const sampleQuote = {
    text: "El sol también ilumina los días tranquilos.",
    author: "MoodWeather",
  };

  const sampleMusic = {
    track: {
      title: "Sunny Vibes",
      artist: "Mood Artist",
      url: "https://soundcloud.com/mood/sunny-vibes",
    },
  };

  axios.__get.mockImplementation((path) => {
    if (path === "/weather") return Promise.resolve({ data: sampleWeather });
    if (path === "/ai-quote") return Promise.resolve({ data: sampleQuote });
    if (path === "/music") return Promise.resolve({ data: sampleMusic });
    if (path === "/geocode") return Promise.resolve({ data: [] });
    return Promise.resolve({ data: {} });
  });
});

test("renderiza el título principal", async () => {
  render(<App />);
  const heading = await screen.findByRole("heading", {
    name: /clima, emociones y música sincronizados/i,
  });

  expect(heading).toBeInTheDocument();
});
