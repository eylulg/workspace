import { describe, expect, it } from "vitest";
import de from "../../../messages/de.json";
import en from "../../../messages/en.json";
import tr from "../../../messages/tr.json";

type Messages = { [key: string]: string | Messages };

function flatten(messages: Messages, prefix = ""): Record<string, string> {
    return Object.fromEntries(
        Object.entries(messages).flatMap(([key, value]) =>
            typeof value === "string" ? [[`${prefix}${key}`, value]] : Object.entries(flatten(value, `${prefix}${key}.`)),
        ),
    );
}

/** The ICU arguments a message expects, such as {identifier} or {count, plural, ...}. */
function argumentsOf(message: string): string[] {
    return [...new Set([...message.matchAll(/\{(\w+)(?=[,}])/g)].map((match) => match[1] ?? ""))].sort();
}

const english = flatten(en);

describe.each([
    ["Turkish", flatten(tr)],
    ["German", flatten(de)],
])("%s messages", (_language, messages) => {
    it("have exactly the English keys", () => {
        expect(Object.keys(messages).sort()).toEqual(Object.keys(english).sort());
    });

    it("use the same arguments as English in every message", () => {
        const mismatches = Object.entries(english).filter(
            ([key, value]) => argumentsOf(value).join() !== argumentsOf(messages[key] ?? "").join(),
        );

        expect(mismatches.map(([key]) => key)).toEqual([]);
    });

    it("contain no long dashes", () => {
        expect(Object.values(messages).filter((value) => new RegExp("[\\u2013\\u2014]").test(value))).toEqual([]);
    });
});
