import { INITIAL_FARM } from "features/game/lib/constants";
import {
  cancelQueuedRecipe,
  getCurrentCookingItem,
} from "./cancelQueuedRecipe";
import { BuildingProduct, PlacedItem } from "features/game/types/game";
import { CookableName } from "features/game/types/consumables";
import { getOilConsumption } from "./cook";

describe("cancelQueuedRecipe", () => {
  it("throws an error if the building does not exist", () => {
    expect(() =>
      cancelQueuedRecipe({
        state: INITIAL_FARM,
        action: {
          type: "recipe.cancelled",
          buildingName: "Bakery",
          buildingId: "1",
          queueItem: {
            name: "Carrot Cake",
            readyAt: 0,
            amount: 1,
          },
        },
      }),
    ).toThrow("Building does not exist");
  });

  it("throws an error if there is no queue", () => {
    expect(() =>
      cancelQueuedRecipe({
        state: {
          ...INITIAL_FARM,
          buildings: {
            Bakery: [
              {
                id: "1",
                coordinates: { x: 0, y: 0 },
                readyAt: 0,
                createdAt: 0,
              },
            ],
          },
        },
        action: {
          type: "recipe.cancelled",
          buildingName: "Bakery",
          buildingId: "1",
          queueItem: {
            name: "Carrot Cake",
            readyAt: 0,
            amount: 1,
          },
        },
      }),
    ).toThrow("No queue exists");
  });

  it("throws an error if no recipe exists at the index", () => {
    expect(() =>
      cancelQueuedRecipe({
        state: {
          ...INITIAL_FARM,
          buildings: {
            Bakery: [
              {
                id: "1",
                coordinates: { x: 0, y: 0 },
                readyAt: 0,
                createdAt: 0,
                crafting: [
                  {
                    name: "Carrot Cake",
                    readyAt: 0,
                    amount: 1,
                  },
                ],
              },
            ],
          },
        },
        action: {
          type: "recipe.cancelled",
          buildingName: "Bakery",
          buildingId: "1",
          queueItem: {
            name: "Sunflower Cake",
            readyAt: 1000,
            amount: 1,
          },
        },
      }),
    ).toThrow("Recipe does not exist");
  });

  it("throws an error if the recipe is currently being cooked", () => {
    const now = new Date("2025-01-01").getTime();
    const carrotCakeReadyAt = now + 60 * 1000;
    const queueItem = {
      name: "Carrot Cake",
      readyAt: carrotCakeReadyAt,
      amount: 1,
    } as BuildingProduct;

    expect(() =>
      cancelQueuedRecipe({
        state: {
          ...INITIAL_FARM,
          buildings: {
            Bakery: [
              {
                id: "1",
                coordinates: { x: 0, y: 0 },
                readyAt: 0,
                createdAt: 0,
                crafting: [
                  {
                    name: "Cornbread",
                    readyAt: now - 1000,
                    amount: 1,
                  },
                  queueItem,
                ],
              },
            ],
          },
        },
        action: {
          type: "recipe.cancelled",
          buildingName: "Bakery",
          buildingId: "1",
          queueItem,
        },
        createdAt: now,
      }),
    ).toThrow(
      `Recipe ${queueItem.name} with readyAt ${carrotCakeReadyAt} is currently being cooked`,
    );
  });

  it("cancels the recipe", () => {
    const now = new Date("2025-01-01").getTime();
    const carrotCakeReadyAt = now + 60 * 1000;
    const queueItem = {
      name: "Carrot Cake",
      readyAt: carrotCakeReadyAt,
      amount: 1,
    } as BuildingProduct;

    const state = cancelQueuedRecipe({
      state: {
        ...INITIAL_FARM,
        buildings: {
          Bakery: [
            {
              id: "1",
              coordinates: { x: 0, y: 0 },
              readyAt: 0,
              createdAt: 0,
              crafting: [
                {
                  name: "Honey Cake",
                  readyAt: now - 1000,
                  amount: 1,
                },
                {
                  name: "Cornbread",
                  readyAt: now + 1000,
                  amount: 1,
                },
                {
                  name: "Carrot Cake",
                  readyAt: carrotCakeReadyAt,
                  amount: 1,
                },
              ],
            },
          ],
        },
      },
      action: {
        type: "recipe.cancelled",
        buildingName: "Bakery",
        buildingId: "1",
        queueItem,
      },
      createdAt: now,
    });

    expect(state.buildings?.Bakery?.[0]?.crafting).toEqual([
      {
        name: "Honey Cake",
        readyAt: now - 1000,
        amount: 1,
      },
      {
        name: "Cornbread",
        readyAt: now + 1000,
        amount: 1,
      },
    ]);
  });

  it("returns the oil consumed by the queued recipe", () => {
    const now = new Date("2025-01-01").getTime();
    const itemName = "Carrot Cake" as CookableName;
    const oil = 1000;
    const oilConsumed = getOilConsumption("Bakery", itemName);

    const item: BuildingProduct = {
      name: itemName,
      readyAt: now + 2 * 60 * 1000,
      amount: 1,
      boost: { Oil: oilConsumed },
    };

    const state = cancelQueuedRecipe({
      state: {
        ...INITIAL_FARM,
        vip: {
          bundles: [{ name: "1_MONTH", boughtAt: Date.now() }],
          expiresAt: Date.now() + 31 * 24 * 60 * 60 * 1000,
        },
        buildings: {
          Bakery: [
            {
              id: "1",
              coordinates: { x: 0, y: 0 },
              readyAt: 0,
              createdAt: 0,
              oil,
              crafting: [
                {
                  name: "Sunflower Cake",
                  readyAt: now + 60 * 1000,
                  amount: 1,
                },
                item,
              ],
            },
          ],
        },
      },
      action: {
        type: "recipe.cancelled",
        buildingId: "1",
        queueItem: item,
        buildingName: "Bakery",
      },
      createdAt: now,
    });

    expect(state.buildings?.Bakery?.[0]?.oil).toEqual(oil + oilConsumed);
  });

  it("returns resources consumed by the recipe", () => {
    const now = new Date("2025-01-01").getTime();
    const carrotCakeReadyAt = now + 60 * 1000;
    const queueItem = {
      name: "Carrot Cake",
      readyAt: carrotCakeReadyAt,
      amount: 1,
    } as BuildingProduct;

    const state = cancelQueuedRecipe({
      state: {
        ...INITIAL_FARM,
        inventory: {},
        buildings: {
          Bakery: [
            {
              id: "1",
              coordinates: { x: 0, y: 0 },
              readyAt: 0,
              createdAt: 0,
              crafting: [
                {
                  name: "Cornbread",
                  readyAt: now + 1000,
                  amount: 1,
                },
                queueItem,
              ],
            },
          ],
        },
      },
      action: {
        type: "recipe.cancelled",
        buildingName: "Bakery",
        buildingId: "1",
        queueItem,
      },
      createdAt: now,
    });

    expect(state.buildings?.Bakery?.[0]?.cancelled).toEqual({
      "Carrot Cake": {
        count: 1,
        cancelledAt: now,
      },
    });
  });

  it("adjusts the readyAt times when cancelling from queue", () => {
    const now = Date.now();
    const POTATO_TIME = 60_000; // 1 minute
    const EGG_TIME = 30_000; // 30 seconds

    const state = cancelQueuedRecipe({
      state: {
        ...INITIAL_FARM,
        buildings: {
          "Fire Pit": [
            {
              id: "1",
              coordinates: { x: 0, y: 0 },
              readyAt: 0,
              createdAt: 0,
              crafting: [
                {
                  name: "Mashed Potato",
                  readyAt: now + POTATO_TIME,
                  amount: 1,
                },
                {
                  name: "Boiled Eggs",
                  readyAt: now + POTATO_TIME + EGG_TIME,
                  amount: 1,
                },
                {
                  name: "Mashed Potato",
                  readyAt: now + POTATO_TIME + EGG_TIME + POTATO_TIME,
                  amount: 1,
                },
              ],
            },
          ],
        },
      },
      action: {
        type: "recipe.cancelled",
        buildingName: "Fire Pit",
        buildingId: "1",
        queueItem: {
          name: "Boiled Eggs",
          readyAt: now + POTATO_TIME + EGG_TIME,
          amount: 1,
        },
      },
      createdAt: now,
    });

    const queue = state.buildings?.["Fire Pit"]?.[0]?.crafting;

    // First recipe unchanged
    expect(queue?.[0].readyAt).toBe(now + POTATO_TIME);

    // Third recipe moved up by EGG_TIME
    expect(queue?.[1].readyAt).toBe(now + POTATO_TIME + POTATO_TIME);
  });
});

describe("getCurrentCookingItem", () => {
  it("returns the current cooking item", () => {
    const now = new Date("2025-01-01").getTime();
    const cornbreadReadyAt = now - 1000;
    const carrotCakeOneReadyAt = now + 60 * 1000;
    const carrotCakeTwoReadyAt = now + 120 * 1000;

    const building: PlacedItem = {
      id: "1",
      coordinates: { x: 0, y: 0 },
      readyAt: 0,
      createdAt: 0,
      crafting: [
        {
          name: "Cornbread" as CookableName,
          readyAt: cornbreadReadyAt,
          amount: 1,
        },
        {
          name: "Carrot Cake" as CookableName,
          readyAt: carrotCakeOneReadyAt,
          amount: 1,
        },
        {
          name: "Carrot Cake" as CookableName,
          readyAt: carrotCakeTwoReadyAt,
          amount: 1,
        },
      ],
    };
    const item = getCurrentCookingItem({
      building,
      createdAt: now,
    });

    expect(item).toEqual({
      name: "Carrot Cake",
      readyAt: carrotCakeOneReadyAt,
      amount: 1,
    });
  });
});
