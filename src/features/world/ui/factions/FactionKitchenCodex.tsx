import React, { useContext, useEffect } from "react";
import { useSelector } from "@xstate/react";
import { Label } from "components/ui/Label";
import { InnerPanel } from "components/ui/Panel";
import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { Context } from "features/game/GameProvider";
import {
  MachineInterpreter,
  MachineState,
} from "features/game/lib/gameMachine";
import { SquareIcon } from "components/ui/SquareIcon";
import { FactionName, ResourceRequest } from "features/game/types/game";
import { NPCIcon } from "features/island/bumpkin/components/NPC";
import { NPC_WEARABLES, NPCName } from "lib/npcs";
import { formatNumber } from "lib/utils/formatNumber";
import mark from "assets/icons/faction_mark.webp";
import { RequirementLabel } from "components/ui/RequirementsLabel";
import Decimal from "decimal.js-light";
import { SUNNYSIDE } from "assets/sunnyside";
import { secondsToString } from "lib/utils/time";

import {
  calculatePoints,
  getFactionWeekEndTime,
  getFactionWeekday,
} from "features/game/lib/factions";
import { ITEM_DETAILS } from "features/game/types/images";

import {
  BASE_POINTS,
  getKingdomKitchenBoost,
} from "features/game/events/landExpansion/deliverFactionKitchen";
import { isMobile } from "mobile-device-detect";
import classNames from "classnames";
import useUiRefresher from "lib/utils/hooks/useUiRefresher";

const _kitchenRequests = (state: MachineState) =>
  state.context.state.faction?.kitchen?.requests;

const _inventory = (state: MachineState) => state.context.state.inventory;

export const KitchenRequests: React.FC = () => {
  const { t } = useAppTranslation();
  const { gameService } = useContext(Context);
  const kitchenRequests = useSelector(gameService, _kitchenRequests);
  const inventory = useSelector(gameService, _inventory);

  const handleReset = () => {
    gameService.send("kingdomChores.refreshed");
    gameService.send("SAVE");
  };
  return (
    <div className="mt-3">
      <InnerPanel className="mb-1 w-full">
        <div className="p-1 text-xs">
          <div className="flex justify-between items-center gap-1">
            <Label type="default">{t("faction.kitchen")}</Label>
            <KitchenResetTimer onReset={handleReset} />
          </div>
          <div className="my-1 space-y-1">
            <span className="w-fit">{t("faction.kitchen.intro")}</span>
          </div>
        </div>
      </InnerPanel>
      <div className="flex flex-col pb-1 space-y-1">
        {kitchenRequests &&
          kitchenRequests.map((request, i) => (
            <KitchenRequestRow
              key={`request-${i}`}
              request={request}
              inventory={inventory}
              gameService={gameService}
            />
          ))}
      </div>
    </div>
  );
};

const KINGDOM_CHORE_NPC: Record<FactionName, NPCName> = {
  goblins: "chef tuck",
  bumpkins: "chef maple",
  nightshades: "chef ebon",
  sunflorians: "chef lumen",
};

interface FactionRequestRowProps {
  request: ResourceRequest;
  inventory: Record<string, Decimal>;
  gameService: MachineInterpreter;
}

const _game = (state: MachineState) => state.context.state;

const KitchenRequestRow: React.FC<FactionRequestRowProps> = ({
  request,
  inventory,
  gameService,
}) => {
  const { faction } = gameService.state.context.state;

  const game = useSelector(gameService, _game);

  const now = Date.now();
  const day = getFactionWeekday(now);
  const fulfilled = request.dailyFulfilled[day] ?? 0;
  const requestReward = calculatePoints(fulfilled, BASE_POINTS);

  const boost = getKingdomKitchenBoost(game, requestReward)[0];
  const boostedMarks = requestReward + boost;

  return (
    <InnerPanel className="flex flex-col w-full">
      <div className={"flex space-x-1 p-1 pb-0 pl-0"}>
        {faction && (
          <div className="pb-1 relative">
            <NPCIcon parts={NPC_WEARABLES[KINGDOM_CHORE_NPC[faction.name]]} />
          </div>
        )}

        <div className={`text-xxs flex-1 space-y-1.5 mb-0.5`}>
          <p>{request.item}</p>
          <div className="ml-1 flex items-center">
            <SquareIcon width={8} icon={ITEM_DETAILS[request.item].image} />
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
              item={request.item}
              balance={inventory[request.item] ?? new Decimal(0)}
              requirement={new Decimal(request.amount)}
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

export const KitchenResetTimer: React.FC<{
  onReset: () => void;
}> = ({ onReset }) => {
  const { t } = useAppTranslation();

  useUiRefresher();

  const now = Date.now();
  const resetsAt = getFactionWeekEndTime({ date: new Date(now) });

  const shouldReset = resetsAt && resetsAt < Date.now();
  const shouldWarn = resetsAt && resetsAt - Date.now() < 100_000;

  useEffect(() => {
    if (shouldReset) onReset();
  }, [shouldReset]);

  if (shouldReset) {
    return (
      <div className="bulge-subtle">
        <Label type="info" icon={SUNNYSIDE.icons.timer}>
          <span className="loading">{t("faction.kitchen.loading")}</span>
        </Label>
      </div>
    );
  }

  return resetsAt ? (
    <div>
      <Label
        type={shouldWarn ? "danger" : "info"}
        className={classNames({ "bulge-subtle": shouldWarn })}
        icon={SUNNYSIDE.icons.stopwatch}
      >
        {t("faction.kitchen.newRequests", {
          time: secondsToString((resetsAt - Date.now()) / 1000, {
            length: "medium",
            removeTrailingZeros: true,
          }),
        })}
      </Label>
    </div>
  ) : (
    <></>
  );
};
