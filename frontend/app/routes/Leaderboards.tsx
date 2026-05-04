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
import { getLeaderboard } from "api/api";

interface LeaderboardEntry {
  rank: number;
  username: string;
  elo: number;
  winRate: number;
  matches: number;
}

const PAGE_SIZE = 10;

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
        setLoading(true);
        const data = await getLeaderboard(100);
        setLeaderboard(data as LeaderboardEntry[]);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard.");
        setLeaderboard([]);
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
              onClick={() => navigate("/")}
              variant={"surface"}
              colorPalette={"green"}
              mb={5}
            >
              &larr; Back to Main Menu
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
