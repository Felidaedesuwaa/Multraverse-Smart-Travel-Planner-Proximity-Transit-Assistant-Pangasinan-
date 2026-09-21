import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Pencil, MapPin } from "lucide-react-native";
import MoneyAmount from "./MoneyAmount";
import { colors } from "../theme/colors";
import { useAppTheme } from "../theme/useAppTheme";
import { PlannerButton as Button } from "./planner/PlannerUI";

export default function ItineraryResult({ plan, onEditStop, disabled = false }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [details, setDetails] = useState(false);
  const text = themeStyle({ fontFamily: "DMSans", color: colors.textPrimary, lineHeight: 22 });
  const heading = themeStyle({ fontFamily: "Poppins", color: colors.oceanBlue, fontSize: 18, fontWeight: "600" });
  const stops = plan.days.flatMap(day => day.stops);
  const allocation = plan.allocation || plan.costs.categories;
  const allocated = Object.values(allocation).reduce((sum, n) => sum + n, 0);
  return <View style={{ gap: 20 }}>
    <View style={{ gap: 6 }}><Text accessibilityLiveRegion="polite" style={heading}>Your {plan.request.days}-day trip plan</Text><Text style={text}>{plan.request.travelers} traveler(s) · {plan.request.dates.start} · Times in Philippine time</Text><Text style={text}>Trip budget: <MoneyAmount value={plan.costs.budget} /></Text></View>
    <Text style={heading}>Suggested budget allocation</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>{Object.entries(allocation).map(([category, amount]) => <View key={category} style={themeStyle({ padding: 14, minWidth: 130, flexGrow: 1, borderRadius: 12, backgroundColor: colors.oceanBlueLight, gap: 4 })}><Text style={text}>{{ food: "Meals", lodging: "Lodging", entry: "Entrance fees", transport: "Transport allowance", buffer: "Extra / emergency" }[category]}</Text><MoneyAmount value={amount} style={heading} /></View>)}</View>
    <Text style={text}>These are spending allowances, not a fare quote. After meals, lodging and listed entry fees, 60% of the remaining budget is reserved for transport and 40% for extras. Missing charges may require more.</Text>
    {allocated > plan.costs.budget && <Text accessibilityRole="alert" style={themeStyle({ ...text, color: colors.sunsetCoral })}>These allowances exceed your budget by <MoneyAmount value={allocated - plan.costs.budget} />. Edit your trip details to reduce costs.</Text>}
    {plan.days.map(day => <View key={day.day} style={themeStyle({ padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, gap: 14 })}>
      <Text style={heading}>Day {day.day} · {day.date}</Text>
      {!day.stops.length && <Text style={text}>No selected place fits this day. Try fewer days, a larger budget or an earlier start.</Text>}
      {day.stops.map(stop => <View key={stop.placeId} style={themeStyle({ gap: 6, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: colors.sunsetCoral })}>
        <Text style={text}>{stop.time}–{stop.endTime} · estimated</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><MapPin size={18} color={themeColor(colors.oceanBlue)} /><Text style={[heading, { flex: 1 }]}>{stop.place}</Text>{onEditStop && <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Edit ${stop.place}`} onPress={() => onEditStop(stop)} style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}><Pencil size={18} color={themeColor(colors.oceanBlue)} /></Pressable>}</View>
        <Text style={text}>{stop.narrative || stop.activity}</Text>
        <Text style={text}>Entrance for your group: {(stop.entryCost ?? stop.listedEntryEstimate) == null ? "Confirm at the venue" : <MoneyAmount value={stop.entryCost ?? stop.listedEntryEstimate} />}{stop.entryCost === null && stop.listedEntryEstimate != null ? " (guide estimate)" : ""}</Text>
        {stop.transit.cost !== null && <Text style={text}>Travel to this stop: <MoneyAmount value={stop.transit.cost} /> for the group.</Text>}
        {stop.transit.steps.map((leg, i) => <Text key={i} style={text}>{leg.vehicle} · {leg.from} → {leg.to} · <MoneyAmount value={leg.cost} /></Text>)}
      </View>)}
      {!!day.stops.length && <Text style={text}>Allow time for meals and rest between visits. Your daily meal allowance is <MoneyAmount value={plan.request.foodPerPersonPerDay * plan.request.travelers} /> for the group.</Text>}
    </View>)}
    <View style={{ gap: 10 }}><Text style={heading}>Fare guide</Text>
      {(plan.fareGuide || []).map(fare => <View key={fare.sourceId} style={themeStyle({ padding: 12, borderRadius: 10, backgroundColor: colors.warmSand, gap: 4 })}><Text style={text}>{fare.from} → {fare.to} · {fare.vehicle}</Text><Text style={heading}><MoneyAmount value={fare.price} />{fare.basis === "person" ? " / person" : fare.basis === "vehicle" ? " / vehicle" : " listed fare"}</Text><Text style={text}>{fare.duration}{fare.basis === "unspecified" ? " · Confirm whether this is per passenger or per vehicle." : ""}</Text></View>)}
      {!plan.fareGuide?.length && <Text style={text}>No matching fare is listed yet. Use your transport allowance as a spending limit and confirm the fare before boarding.</Text>}
      {!!plan.fareGuide?.length && <Text style={text}>Guide prices may change. Not every connection is covered; do not add these options together as a complete trip fare.</Text>}
      {plan.returnLeg && <Text style={text}>Return trip: {plan.returnLeg.cost === null ? "Confirm the return fare and last departure before leaving." : <MoneyAmount value={plan.returnLeg.cost} suffix=" recorded group fare; confirm the last departure." />}</Text>}
    </View>
    <View style={{ gap: 10 }}><Text style={heading}>Food to try</Text>{plan.localFoods.map(food => <View key={food.name} style={themeStyle({ padding: 14, borderRadius: 12, backgroundColor: colors.palmGreenLight, gap: 5 })}><Text style={heading}>{food.name}</Text>{food.description && <Text style={text}>{food.description}</Text>}<Text style={text}>{food.where}</Text><Text style={text}>{food.listedAveragePrice == null ? "Ask the vendor for the price." : <MoneyAmount value={food.listedAveragePrice} prefix="Around " suffix=" listed average; portion sizes vary." />}</Text></View>)}{!plan.localFoods.length && <Text style={text}>No food recommendations are listed for this place yet. Your meal allowance is still included.</Text>}<Text style={text}>Use your meal allowance for these suggestions; they are not extra charges.</Text></View>
    <Button onPress={() => setDetails(value => !value)}>{details ? "Hide planning notes" : "View planning notes and missing costs"}</Button>
    {details && <View style={{ gap: 8 }}><Text style={text}>Recorded subtotal: <MoneyAmount value={plan.costs.knownTotal} />. Unpriced items are excluded.</Text>{plan.warnings.map(warning => <Text key={warning} style={text}>{warning}</Text>)}{stops.flatMap(stop => stop.notes.map(note => <Text key={`${stop.placeId}-${note}`} style={text}>{stop.place}: {note}</Text>))}</View>}
    {!!plan.omitted.length && <View style={{ gap: 6 }}><Text style={heading}>Places that could not fit</Text>{plan.omitted.map((item, i) => <Text key={i} style={text}>{item.reason}</Text>)}</View>}
  </View>;
}
