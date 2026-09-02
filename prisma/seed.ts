import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const venue = await prisma.venue.create({
    data: {
      name: "Burns Park Sports Complex",
      address: "1 Funland Dr",
      city: "North Little Rock",
      state: "AR",
      fieldCount: 8,
    },
  });

  const tournament = await prisma.tournament.create({
    data: {
      name: "Fall Classic Softball Showdown",
      sport: "SOFTBALL",
      startDate: new Date("2026-10-10"),
      endDate: new Date("2026-10-11"),
      venueId: venue.id,
      city: "North Little Rock",
      entryFeeCents: 45000,
      teamCap: 16,
      description:
        "Pool play into single-elimination bracket. Gate admission and team insurance available on-site.",
    },
  });

  const division = await prisma.division.create({
    data: {
      tournamentId: tournament.id,
      label: "10U Gold",
      ageLimit: 10,
    },
  });

  const teamNames = [
    "Arkansas Blackout",
    "River City Fury",
    "Delta Diamonds",
    "Ozark Outlaws",
    "Rock City Rattlers",
    "Natural State Ninjas",
  ];

  const registrations = [];
  for (const name of teamNames) {
    const reg = await prisma.registration.create({
      data: {
        tournamentId: tournament.id,
        divisionId: division.id,
        teamName: name,
        coachName: "Coach " + name.split(" ")[0],
        coachEmail: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        coachPhone: "501-555-0100",
        status: "PAID",
        paidAt: new Date(),
        poolWins: Math.floor(Math.random() * 3),
        poolLosses: Math.floor(Math.random() * 2),
        runsFor: Math.floor(Math.random() * 20) + 5,
        runsAgainst: Math.floor(Math.random() * 15) + 3,
      },
    });
    registrations.push(reg);
  }

  console.log(
    `Seeded 1 tournament, 1 division, ${registrations.length} teams.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
