import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Pagination,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { useColorModeValue } from "app/components/ui/color-mode";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

interface LeaderboardEntry {
  rank: number;
  username: string;
  elo: number;
  winRate: number;
  matches: number;
}

interface LeaderboardPlayer {
  username: string;
  elo: number;
  winRate: number;
  matches: number;
}

const PAGE_SIZE = 10;

const MOCK_PLAYERS: LeaderboardPlayer[] = [
  { username: "ProGamer2024", elo: 1915, winRate: 71.4, matches: 62 },
  { username: "QuizMaster", elo: 1878, winRate: 69.6, matches: 58 },
  { username: "BrainChampion", elo: 1844, winRate: 68.2, matches: 71 },
  { username: "TriviaNinja", elo: 1816, winRate: 66.9, matches: 54 },
  { username: "CerebralKing", elo: 1792, winRate: 65.7, matches: 49 },
  { username: "MindSolver", elo: 1769, winRate: 64.8, matches: 66 },
  { username: "LogicLord", elo: 1734, winRate: 63.2, matches: 61 },
  { username: "ThinkTank", elo: 1718, winRate: 62.4, matches: 57 },
  { username: "NeuralNet", elo: 1697, winRate: 61.1, matches: 53 },
  { username: "SynapseSeeker", elo: 1679, winRate: 60.4, matches: 50 },
  { username: "GreenGenius", elo: 1656, winRate: 59.8, matches: 48 },
  { username: "PyramidAce", elo: 1638, winRate: 58.9, matches: 46 },
  { username: "AnswerAlchemist", elo: 1621, winRate: 58.1, matches: 44 },
  { username: "HexaHero", elo: 1604, winRate: 57.5, matches: 42 },
  { username: "ClueCaptain", elo: 1588, winRate: 56.8, matches: 41 },
  { username: "PulsePilot", elo: 1572, winRate: 55.9, matches: 39 },
  { username: "QuestionQuarry", elo: 1558, winRate: 55.1, matches: 38 },
  { username: "RiddleRunner", elo: 1541, winRate: 54.6, matches: 37 },
  { username: "TileTactician", elo: 1527, winRate: 53.9, matches: 35 },
  { username: "StackedStrategy", elo: 1513, winRate: 53.2, matches: 34 },
  { username: "BoardBeast", elo: 1498, winRate: 52.8, matches: 33 },
  { username: "QueryKnight", elo: 1484, winRate: 52.1, matches: 32 },
  { username: "MatchMage", elo: 1471, winRate: 51.4, matches: 31 },
  { username: "EloEcho", elo: 1458, winRate: 50.8, matches: 30 },
  { username: "Winwave", elo: 1442, winRate: 50.1, matches: 29 },
  { username: "BrainBloom", elo: 1428, winRate: 49.7, matches: 28 },
  { username: "QuizCurrent", elo: 1414, winRate: 49.1, matches: 27 },
  { username: "PonderPeak", elo: 1399, winRate: 48.6, matches: 26 },
  { username: "LogicLeaf", elo: 1385, winRate: 48.0, matches: 25 },
  { username: "GreenSignal", elo: 1369, winRate: 47.4, matches: 24 },
];

const SORTED_LEADERBOARD: LeaderboardEntry[] = [...MOCK_PLAYERS]
  .sort((first, second) => second.elo - first.elo)
  .map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

export function meta() {
  return [
    { title: "Leaderboards - AZ Quizz" },
    {
      name: "description",
      content: "View the top players on the leaderboard ranked by ELO rating.",
    },
  ];
}

export default function Leaderboards() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageBg = useColorModeValue("bg", "gray.950");
  const panelBg = useColorModeValue("bg", "gray.900");
  const subtleBg = useColorModeValue("bg.subtle", "whiteAlpha.100");
  const borderColor = useColorModeValue("green.200", "whiteAlpha.200");
  const headerBg = useColorModeValue("green.600", "green.700");
  const headingColor = useColorModeValue("green.700", "green.300");
  const mutedColor = useColorModeValue("fg.muted", "gray.400");
  const accentBg = useColorModeValue("green.50", "green.950");
  const badgeBg = useColorModeValue("green.100", "green.900");
  const badgeText = useColorModeValue("green.800", "green.100");
  const neutralPillBg = useColorModeValue("gray.100", "gray.800");
  const rowStripeBg = useColorModeValue("blackAlpha.50", "whiteAlpha.50");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // TODO: Replace with actual API call to /api/users/leaderboard.
        // The mocked data keeps the page usable until the backend endpoint exists.
        setLeaderboard(SORTED_LEADERBOARD);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard. Displaying mock data.");
        setLeaderboard(SORTED_LEADERBOARD);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const totalPages = Math.max(Math.ceil(leaderboard.length / PAGE_SIZE), 1);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedLeaderboard = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return leaderboard.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, leaderboard]);

  const pageStartRank =
    leaderboard.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEndRank = Math.min(currentPage * PAGE_SIZE, leaderboard.length);

  return (
    <Box minH="100vh" bg={pageBg}>
      <Container maxW="6xl" py={{ base: 4, md: 8 }}>
        <Heading size="4xl">Leaderboards</Heading>
        <Stack gap={6}>
          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align={{ base: "stretch", md: "center" }}
            p={{ base: 4, md: 5 }}
          >
            <Button
              alignSelf={{ base: "stretch", md: "auto" }}
              variant="outline"
              colorPalette="green"
              bg={panelBg}
              onClick={() => navigate("/")}
            >
              Back to Menu
            </Button>
          </Flex>

          {error && (
            <Box
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={borderColor}
              bg={accentBg}
              color={headingColor}
            >
              {error}
            </Box>
          )}

          <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            gap={3}
            px={{ base: 1, md: 2 }}
            align={{ base: "stretch", md: "center" }}
          >
            <Text color={headingColor} fontWeight="semibold">
              Showing {pageStartRank}-{pageEndRank} of {leaderboard.length}{" "}
              players
            </Text>
          </Flex>

          {loading ? (
            <Box textAlign="center" py={12} color={mutedColor}>
              Loading leaderboard...
            </Box>
          ) : (
            <Stack gap={4}>
              <Box
                display={{ base: "block", md: "none" }}
                borderRadius="xl"
                overflow="hidden"
                borderWidth="1px"
                borderColor={borderColor}
                bg={subtleBg}
                shadow="sm"
              >
                <Stack gap={0}>
                  {paginatedLeaderboard.map((entry) => (
                    <Box
                      key={entry.username}
                      p={4}
                      borderBottomWidth="1px"
                      borderBottomColor={borderColor}
                      bg={entry.rank <= 3 ? accentBg : subtleBg}
                      _last={{ borderBottomWidth: 0 }}
                    >
                      <Flex justify="space-between" gap={4} align="center">
                        <Box>
                          <Text
                            fontSize="xs"
                            color={mutedColor}
                            fontWeight="bold"
                          >
                            #{entry.rank}
                          </Text>
                          <Text
                            fontSize="lg"
                            fontWeight="bold"
                            color={headingColor}
                          >
                            {entry.username}
                          </Text>
                        </Box>
                        <Box
                          px={3}
                          py={1}
                          borderRadius="full"
                          bg={badgeBg}
                          color={badgeText}
                          fontWeight="bold"
                        >
                          {entry.elo} ELO
                        </Box>
                      </Flex>
                      <Flex mt={3} gap={2} wrap="wrap">
                        <Box
                          px={3}
                          py={1}
                          borderRadius="full"
                          bg={neutralPillBg}
                          color={mutedColor}
                        >
                          Win rate {entry.winRate.toFixed(1)}%
                        </Box>
                        <Box
                          px={3}
                          py={1}
                          borderRadius="full"
                          bg={neutralPillBg}
                          color={mutedColor}
                        >
                          {entry.matches} matches
                        </Box>
                      </Flex>
                    </Box>
                  ))}
                </Stack>
              </Box>

              <Box
                display={{ base: "none", md: "block" }}
                overflowX="auto"
                borderRadius="xl"
                borderWidth="1px"
                borderColor={borderColor}
                bg={subtleBg}
                shadow="sm"
              >
                <Table.Root size="sm" variant="outline">
                  <Table.Header bg={headerBg}>
                    <Table.Row>
                      <Table.ColumnHeader
                        color="white"
                        textAlign="center"
                        width="80px"
                      >
                        Rank
                      </Table.ColumnHeader>
                      <Table.ColumnHeader color="white">
                        Username
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        color="white"
                        textAlign="right"
                        width="120px"
                      >
                        ELO
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        color="white"
                        textAlign="right"
                        width="140px"
                      >
                        Win Rate
                      </Table.ColumnHeader>
                      <Table.ColumnHeader
                        color="white"
                        textAlign="right"
                        width="110px"
                      >
                        Matches
                      </Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {paginatedLeaderboard.map((entry) => (
                      <Table.Row
                        key={entry.username}
                        _odd={{ bg: rowStripeBg }}
                        _hover={{ bg: accentBg }}
                        transition="background-color 0.2s ease"
                      >
                        <Table.Cell textAlign="center">
                          <Box
                            display="inline-flex"
                            minW="36px"
                            px={2}
                            py={1}
                            justifyContent="center"
                            borderRadius="full"
                            bg={
                              entry.rank === 1
                                ? "yellow.300"
                                : entry.rank === 2
                                  ? "gray.300"
                                  : entry.rank === 3
                                    ? "orange.300"
                                    : neutralPillBg
                            }
                            color={entry.rank <= 3 ? "green.950" : mutedColor}
                            fontWeight="bold"
                          >
                            #{entry.rank}
                          </Box>
                        </Table.Cell>
                        <Table.Cell
                          fontWeight={entry.rank <= 3 ? "bold" : "medium"}
                        >
                          {entry.username}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Box fontWeight="bold" color={headingColor}>
                            {entry.elo}
                          </Box>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {entry.winRate.toFixed(1)}%
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {entry.matches}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>

              <Pagination.Root
                count={leaderboard.length}
                pageSize={PAGE_SIZE}
                page={currentPage}
                siblingCount={1}
                boundaryCount={1}
                onPageChange={(details) => setCurrentPage(details.page)}
              >
                <Stack gap={4}>
                  <Flex justify="center" wrap="wrap" gap={2}>
                    <Pagination.PrevTrigger>
                      <Button variant="outline" colorPalette="green" size="sm">
                        Previous
                      </Button>
                    </Pagination.PrevTrigger>

                    <HStack gap={2}>
                      <Pagination.Items
                        render={(page) => (
                          <Button
                            size="sm"
                            minW="40px"
                            colorPalette="green"
                            variant={
                              page.value === currentPage ? "solid" : "outline"
                            }
                          >
                            {page.value}
                          </Button>
                        )}
                        ellipsis={
                          <Box px={2} alignSelf="center" color={mutedColor}>
                            ...
                          </Box>
                        }
                      />
                    </HStack>

                    <Pagination.NextTrigger>
                      <Button variant="solid" colorPalette="green" size="sm">
                        Next
                      </Button>
                    </Pagination.NextTrigger>
                  </Flex>
                </Stack>
              </Pagination.Root>
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
