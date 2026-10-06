import type { ChildGuardian, Guardian, GuardianRelationship } from "@/types/domain";
import { mockChildren } from "./children";
import { ORG_ID } from "./organization";

const motherNames = [
  "Sarah", "Keisha", "Rachel", "Danielle", "Jennifer", "Monique", "Ashley", "Tanya", "Maria", "Rosa",
  "Nicole", "Stephanie", "Andrea", "Melissa", "Priya", "Latoya", "Natalie", "Brianna", "Camila", "Vanessa",
  "Jasmine", "Erica", "Lauren", "Kimberly", "Alicia", "Gabriela", "Shanice", "Megan", "Diana", "Paula",
  "Tiffany", "Sandra", "Carmen", "Olga",
];
const fatherNames = [
  "Marcus", "Andre", "Kevin", "Brandon", "Chris", "Derrick", "Jason", "Omar", "Carlos", "Luis",
  "Ryan", "Michael", "Anthony", "Patrick", "Raj", "Tyrone", "Steven", "Jamal", "Diego", "Victor",
  "Darnell", "Eric", "Justin", "Robert", "Adrian", "Javier", "Terrence", "Daniel", "Simon", "Paul",
  "Travis", "George", "Hector", "Ivan",
];

const guardians: Guardian[] = [];
const links: ChildGuardian[] = [];

function phoneFor(n: number): string {
  return `+501 6${String(10 + (n % 89)).padStart(2, "0")}-${String(1000 + ((n * 7919) % 9000)).slice(0, 4)}`;
}

function addGuardian(
  childId: string,
  firstName: string,
  lastName: string,
  relationship: GuardianRelationship,
  opts: { isPrimary: boolean; canPickUp: boolean; isEmergencyContact: boolean },
): void {
  const id = `g_${firstName.toLowerCase()}_${lastName.toLowerCase()}_${guardians.length}`;
  guardians.push({
    id,
    organizationId: ORG_ID,
    firstName,
    lastName,
    phone: phoneFor(guardians.length + 3),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mail.example`,
  });
  links.push({ id: `cg_${links.length}`, organizationId: ORG_ID, childId, guardianId: id, relationship, ...opts });
}

mockChildren.forEach((child, i) => {
  addGuardian(child.id, motherNames[i], child.lastName, "Mother", {
    isPrimary: true,
    canPickUp: true,
    isEmergencyContact: false,
  });
  addGuardian(child.id, fatherNames[i], child.lastName, "Father", {
    isPrimary: false,
    canPickUp: true,
    isEmergencyContact: false,
  });
  // Every third family has a grandparent listed as the emergency contact.
  if (i % 3 === 0) {
    addGuardian(child.id, i % 2 === 0 ? "Ruth" : "Gloria", child.lastName, "Grandmother", {
      isPrimary: false,
      canPickUp: false,
      isEmergencyContact: true,
    });
  } else {
    links[links.length - 1].isEmergencyContact = true;
  }
});

export const mockGuardians: Guardian[] = guardians;
export const mockChildGuardians: ChildGuardian[] = links;
