import React, { useContext } from "react";
import { useSelector } from "@xstate/react";
import { Label } from "components/ui/Label";
import { InnerPanel } from "components/ui/Panel";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { Context } from "features/game/GameProvider";
import {
  MachineInterpreter,
  MachineState,
} from "features/game/lib/gameMachine";

import {
  CollectivePet,
  Faction,
  FactionName,
  FactionPetRequest,
  InventoryItemName,
} from "features/game/types/game";

import {
  DifficultyIndex,
  PET_FED_REWARDS_KEY,
  getKingdomPetBoost,
} from "features/game/events/landExpansion/feedFactionPet";

import { KitchenResetTimer } from "./FactionKitchenCodex";

import {
  calculatePoints,
  getFactionWeekday,
  getWeekKey,
} from "features/game/lib/factions";
import { ITEM_DETAILS } from "features/game/types/images";

import { isMobile } from "mobile-device-detect";
import classNames from "classnames";

import { PetState } from "./FactionPetPanel";

import { SquareIcon } from "components/ui/SquareIcon";
import { formatNumber } from "lib/utils/formatNumber";
import mark from "assets/icons/faction_mark.webp";
import { RequirementLabel } from "components/ui/RequirementsLabel";
import Decimal from "decimal.js-light";

// Pet Sprites
import bumpkins_pet_hungry from "public/world/bumpkins_pet_hungry.webp";
import bumpkins_pet_sleeping from "public/world/bumpkins_pet_sleeping.webp";
import bumpkins_pet_happy from "public/world/bumpkins_pet_happy.webp";

import sunflorians_pet_hungry from "public/world/sunflorians_pet_hungry.webp";
import sunflorians_pet_sleeping from "public/world/sunflorians_pet_sleeping.webp";
import sunflorians_pet_happy from "public/world/sunflorians_pet_happy.webp";

import goblins_pet_hungry from "public/world/goblins_pet_hungry.webp";
import goblins_pet_sleeping from "public/world/goblins_pet_sleeping.webp";
import goblins_pet_happy from "public/world/goblins_pet_happy.webp";

import nightshades_pet_hungry from "public/world/nightshades_pet_hungry.webp";
import nightshades_pet_sleeping from "public/world/nightshades_pet_sleeping.webp";
import nightshades_pet_happy from "public/world/nightshades_pet_happy.webp";

const _faction = (state: MachineState) =>
  state.context.state.faction as Faction;

const _petRequests = (state: MachineState) =>
  state.context.state.faction?.pet?.requests;

const _inventory = (state: MachineState) => state.context.state.inventory;

const getPetState = (collectivePet: CollectivePet): PetState => {
  if (collectivePet.sleeping) return "sleeping";

  if (collectivePet.goalReached) return "happy";

  return "hungry";
};

export const PetRequests: React.FC = () => {
  const { t } = useAppTranslation();
  const { gameService } = useContext(Context);
  const petRequests = useSelector(gameService, _petRequests);
  const inventory = useSelector(gameService, _inventory);

  const week = getWeekKey({ date: new Date() });
  const faction = useSelector(gameService, _faction);
  const collectivePet = faction.history[week].collectivePet as CollectivePet;

  const handleReset = () => {
    gameService.send("kingdomChores.refreshed");
    gameService.send("SAVE");
  };
  return (
    <div className="mt-3">
      <InnerPanel className="mb-1 w-full">
        <div className="p-1 text-xs">
          <div className="flex justify-between items-center gap-1">
            <Label type="default">{t("faction.pet")}</Label>
            <KitchenResetTimer onReset={handleReset} />
          </div>
          <div className="my-1 space-y-1">
            <span className="w-fit">{t("faction.pet.intro")}</span>
          </div>
        </div>
      </InnerPanel>
      <div className="flex flex-col pb-1 space-y-1">
        {petRequests &&
          petRequests.map((request, i) => (
            <PetRequestRow
              key={`request-${i}`}
              request={request}
              inventory={inventory}
              gameService={gameService}
              idx={i}
              collectivePet={collectivePet}
            />
          ))}
      </div>
    </div>
  );
};

const PET_IMAGE: Record<FactionName, Record<PetState, string>> = {
  goblins: {
    hungry: goblins_pet_hungry,
    sleeping: goblins_pet_sleeping,
    happy: goblins_pet_happy,
  },
  bumpkins: {
    hungry: bumpkins_pet_hungry,
    sleeping: bumpkins_pet_sleeping,
    happy: bumpkins_pet_happy,
  },
  nightshades: {
    hungry: nightshades_pet_hungry,
    sleeping: nightshades_pet_sleeping,
    happy: nightshades_pet_happy,
  },
  sunflorians: {
    hungry: sunflorians_pet_hungry,
    sleeping: sunflorians_pet_sleeping,
    happy: sunflorians_pet_happy,
  },
};

interface PetRequestRowProps {
  request: FactionPetRequest;
  inventory: Record<string, Decimal>;
  gameService: MachineInterpreter;
  idx: number;
  collectivePet: CollectivePet;
}

const _game = (state: MachineState) => state.context.state;

const PetRequestRow: React.FC<PetRequestRowProps> = ({
  request,
  inventory,
  gameService,
  idx,
  collectivePet,
}) => {
  const { faction } = gameService.state.context.state;

  const now = Date.now();
  const day = getFactionWeekday(now);
  const fulfilled = request.dailyFulfilled[day] ?? 0;
  const points = calculatePoints(
    fulfilled,
    PET_FED_REWARDS_KEY[idx as DifficultyIndex],
  );

  const boost = getKingdomPetBoost(gameService.state.context.state, points)[0];

  const boostedMarks = points + boost;

  return (
    <InnerPanel className="flex flex-col w-full">
      <div className={"flex space-x-1 p-1 pb-0 pl-0"}>
        {faction && (
          <div className="pb-1 relative">
            <img
              src={PET_IMAGE[faction.name][getPetState(collectivePet)]}
              className="w-10 h-10"
            />
          </div>
        )}

        <div className={`text-xxs flex-1 space-y-1.5 mb-0.5`}>
          <p>{request.food as InventoryItemName}</p>
          <div className="ml-1 flex items-center">
            <SquareIcon
              width={8}
              icon={ITEM_DETAILS[request.food as InventoryItemName].image}
            />
            <RequirementLabel
              className={classNames(
                "flex justify-between items-center sm:justify-center",
                {
                  "-mt-1": isMobile,
                },
              )}
              showLabel={isMobile}
              hideIcon={!isMobile}
              type="item"
              item={request.food}
              balance={
                inventory[request.food as InventoryItemName] ?? new Decimal(0)
              }
              requirement={new Decimal(request.quantity)}
            />
          </div>
        </div>

        <div className="flex flex-col text-xs space-y-1">
          <div className="flex items-center justify-end space-x-1">
            <span className="mb-0.5 font-secondary">
              {formatNumber(boostedMarks)}
            </span>
            <SquareIcon icon={mark} width={6} />
          </div>
        </div>
      </div>
    </InnerPanel>
  );
};
