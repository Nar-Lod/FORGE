export type FocusItem = { id:string; glyph:string; label:string; tone:string };
export const FOCUS_LIBRARIES: Record<string, FocusItem[]> = {
 shapes: ["●","▲","◆","■","★","✦","⬢","✚","✖","♥","☀","☾","⬣","⬤"].map((glyph,i)=>({id:"shape-"+i,glyph,label:"shape "+(i+1),tone:"solid"})),
 emojis: ["😀","😎","🤖","👻","🥳","🤩","😺","🐸","🦊","🐼","🐙","🦄","😈","🤠"].map((glyph,i)=>({id:"emoji-"+i,glyph,label:"emoji "+(i+1),tone:"emoji"})),
 animals: ["🐶","🐱","🦁","🐯","🐸","🐵","🐼","🐨","🦊","🐰","🐙","🦋","🐢","🦓"].map((glyph,i)=>({id:"animal-"+i,glyph,label:"animal "+(i+1),tone:"emoji"})),
 food: ["🥕","🍅","🌽","🥦","🍆","🍎","🍋","🍊","🥑","🍇","🍓","🥔","🍉","🍌"].map((glyph,i)=>({id:"food-"+i,glyph,label:"food "+(i+1),tone:"emoji"})),
 vehicles: ["🚗","🚕","🚌","🚓","🚑","🚒","🚜","🏎️","🚲","🏍️","🚁","✈️","🚀","🚤"].map((glyph,i)=>({id:"vehicle-"+i,glyph,label:"vehicle "+(i+1),tone:"emoji"})),
 flags: ["🇰🇪","🇺🇬","🇹🇿","🇷🇼","🇿🇦","🇬🇭","🇳🇬","🇪🇬","🇬🇧","🇺🇸","🇯🇵","🇧🇷","🇫🇷","🇩🇪"].map((glyph,i)=>({id:"flag-"+i,glyph,label:"flag "+(i+1),tone:"emoji"})),
};
export const FOCUS_MODES = Object.keys(FOCUS_LIBRARIES);