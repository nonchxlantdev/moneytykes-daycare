import type { Child, ClassroomId } from "@/types/domain";
import { ORG_ID } from "./organization";

type ChildSeed = [
  id: string,
  firstName: string,
  lastName: string,
  dateOfBirth: string,
  classroomId: ClassroomId,
  allergies?: string[],
  medicalNotes?: string,
];

const seeds: ChildSeed[] = [
  ["amari-young", "Amari", "Young", "2021-03-14", "toddlers", ["Peanuts"], "Carries an EpiPen in her backpack. Staff trained."],
  ["jayden-smith", "Jayden", "Smith", "2022-07-02", "preschool"],
  ["sophie-jones", "Sophie", "Jones", "2022-01-19", "preschool", [], "Mild eczema — fragrance-free sunscreen only."],
  ["noah-brown", "Noah", "Brown", "2023-05-27", "toddlers"],
  ["emma-white", "Emma", "White", "2021-11-08", "pre-k", ["Dairy"]],
  ["liam-carter", "Liam", "Carter", "2022-09-30", "preschool"],
  ["olivia-martin", "Olivia", "Martin", "2023-02-11", "toddlers"],
  ["ethan-wilson", "Ethan", "Wilson", "2021-06-23", "pre-k"],
  ["mia-garcia", "Mia", "Garcia", "2024-12-04", "infants"],
  ["lucas-ramirez", "Lucas", "Ramirez", "2025-02-17", "infants"],
  ["ava-thompson", "Ava", "Thompson", "2022-04-09", "preschool", ["Eggs"]],
  ["mason-clark", "Mason", "Clark", "2021-08-15", "pre-k"],
  ["isabella-lewis", "Isabella", "Lewis", "2023-07-21", "toddlers"],
  ["elijah-walker", "Elijah", "Walker", "2022-10-12", "preschool"],
  ["chloe-hall", "Chloe", "Hall", "2024-09-01", "infants"],
  ["james-allen", "James", "Allen", "2021-04-30", "pre-k", [], "Asthma — inhaler kept in classroom first-aid kit."],
  ["zoe-king", "Zoe", "King", "2023-03-03", "toddlers"],
  ["benjamin-wright", "Benjamin", "Wright", "2022-02-25", "preschool"],
  ["layla-scott", "Layla", "Scott", "2021-12-19", "pre-k"],
  ["daniel-green", "Daniel", "Green", "2023-09-14", "toddlers"],
  ["aria-baker", "Aria", "Baker", "2025-01-08", "infants"],
  ["henry-adams", "Henry", "Adams", "2022-06-06", "preschool"],
  ["nora-nelson", "Nora", "Nelson", "2021-09-27", "pre-k", ["Strawberries"]],
  ["sebastian-hill", "Sebastian", "Hill", "2023-11-02", "toddlers"],
  ["grace-campbell", "Grace", "Campbell", "2022-03-16", "preschool"],
  ["jack-mitchell", "Jack", "Mitchell", "2021-05-05", "pre-k"],
  ["lily-roberts", "Lily", "Roberts", "2024-10-22", "infants"],
  ["owen-turner", "Owen", "Turner", "2023-01-29", "toddlers"],
  ["hannah-phillips", "Hannah", "Phillips", "2022-08-08", "preschool"],
  ["caleb-evans", "Caleb", "Evans", "2021-10-10", "pre-k"],
  ["ella-edwards", "Ella", "Edwards", "2023-06-18", "toddlers", ["Tree nuts"]],
  ["wyatt-collins", "Wyatt", "Collins", "2022-11-24", "preschool"],
  ["stella-morris", "Stella", "Morris", "2024-08-13", "infants"],
  ["leo-rogers", "Leo", "Rogers", "2021-07-07", "pre-k"],
];

export const mockChildren: Child[] = seeds.map(
  ([id, firstName, lastName, dateOfBirth, classroomId, allergies = [], medicalNotes], index) => ({
    id,
    organizationId: ORG_ID,
    firstName,
    lastName,
    dateOfBirth,
    classroomId,
    enrollmentStatus: "ACTIVE",
    enrolledOn: `20${24 + (index % 3 === 0 ? 1 : 0)}-0${(index % 8) + 1}-0${(index % 9) + 1}`,
    allergies,
    medicalNotes,
    notes:
      id === "amari-young"
        ? "Loves painting and the reading corner. Naps best with her blue blanket."
        : undefined,
  }),
);
