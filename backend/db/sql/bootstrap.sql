CREATE TABLE IF NOT EXISTS users (
  firebase_uid varchar PRIMARY KEY,
  username varchar UNIQUE NOT NULL,
  elo_rating int DEFAULT 1200
);

CREATE TABLE IF NOT EXISTS standard_questions (
  id SERIAL PRIMARY KEY,
  initials varchar NOT NULL,
  question_text text NOT NULL UNIQUE,
  correct_answer varchar NOT NULL,
  category varchar,
  difficulty int DEFAULT 1
);

CREATE TABLE IF NOT EXISTS yes_no_questions (
  id SERIAL PRIMARY KEY,
  question_text text NOT NULL UNIQUE,
  correct_answer boolean NOT NULL,
  category varchar
);

CREATE TABLE IF NOT EXISTS matches (
  id BIGSERIAL PRIMARY KEY,
  player1_id varchar NOT NULL REFERENCES users (firebase_uid),
  player2_id varchar NOT NULL REFERENCES users (firebase_uid),
  winner_id varchar REFERENCES users (firebase_uid),
  player1_elo_change int,
  player2_elo_change int,
  status varchar NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'aborted')),
  started_at timestamp DEFAULT (now()),
  finished_at timestamp
);

CREATE TABLE IF NOT EXISTS match_turns (
  id BIGSERIAL PRIMARY KEY,
  match_id bigint NOT NULL REFERENCES matches (id),
  player_id varchar NOT NULL REFERENCES users (firebase_uid),
  tile_id int NOT NULL,
  standard_question_id int REFERENCES standard_questions (id),
  yes_no_question_id int REFERENCES yes_no_questions (id),
  is_correct boolean NOT NULL,
  turn_timestamp timestamp DEFAULT (now()),
  CONSTRAINT check_one_question_type CHECK (
    (standard_question_id IS NOT NULL AND yes_no_question_id IS NULL)
    OR
    (standard_question_id IS NULL AND yes_no_question_id IS NOT NULL)
  )
);

COMMENT ON COLUMN users.elo_rating IS 'Determines MMR and Leaderboard rank';
COMMENT ON COLUMN standard_questions.initials IS 'e.g., "A", "CH", "K"';
COMMENT ON COLUMN standard_questions.difficulty IS '1 to 5 scale';
COMMENT ON COLUMN yes_no_questions.question_text IS 'For wrongly answered/contested tiles';
COMMENT ON COLUMN matches.winner_id IS 'Null if match is a draw or ongoing';
COMMENT ON COLUMN matches.player1_elo_change IS 'e.g., +15 or -12';
COMMENT ON COLUMN matches.player2_elo_change IS 'e.g., -15 or +12';
COMMENT ON COLUMN matches.status IS 'ongoing, completed, aborted';
COMMENT ON COLUMN match_turns.tile_id IS 'Tile number 1-28 on the AZ kvíz pyramid';
COMMENT ON COLUMN match_turns.standard_question_id IS 'Null if a Yes/No question was used';
COMMENT ON COLUMN match_turns.yes_no_question_id IS 'Null if a standard question was used';

DELETE FROM standard_questions;
DELETE FROM yes_no_questions;

INSERT INTO standard_questions (initials, question_text, correct_answer, category, difficulty) VALUES
('ME', 'What is the tallest mountain on Earth?', 'Mount Everest', 'Geography', 1),
('MS', 'Which planet is known as the Red Planet?', 'Mars', 'Science', 1),
('DL', 'Who painted the Mona Lisa?', 'Leonardo da Vinci', 'Art', 2),
('O', 'What is the chemical symbol for Oxygen?', 'O', 'Science', 1),
('FR', 'In which country would you find the Eiffel Tower?', 'France', 'Geography', 1),
('W', 'What is the common name for H2O?', 'Water', 'Science', 1),
('ST', 'Who wrote the play Romeo and Juliet?', 'William Shakespeare', 'Literature', 2),
('JP', 'Which country is known as the Land of the Rising Sun?', 'Japan', 'Geography', 2),
('V', 'What is the fastest land animal?', 'Cheetah', 'Nature', 2),
('AU', 'What is the smallest continent by land area?', 'Australia', 'Geography', 2),
('E', 'What is the value of the base of natural logarithms?', 'e', 'Math', 4),
('AM', 'Who was the first man to walk on the moon?', 'Neil Armstrong', 'History', 2),
('B', 'Which element has the atomic number 5?', 'Boron', 'Science', 4),
('I', 'What is the capital of Italy?', 'Rome', 'Geography', 1),
('EG', 'In which country are the Great Pyramids of Giza located?', 'Egypt', 'History', 1),
('BP', 'What is the capital of Hungary?', 'Budapest', 'Geography', 3),
('AC', 'What does the acronym DNA stand for?', 'Deoxyribonucleic Acid', 'Science', 3),
('RE', 'What is the currency of Japan?', 'Yen', 'Finance', 2),
('PC', 'Who is known as the father of modern physics?', 'Albert Einstein', 'Science', 2),
('A', 'What is the largest ocean on Earth?', 'Pacific', 'Geography', 1),
('B', 'What is the capital of Germany?', 'Berlin', 'Geography', 2),
('BR', 'Which country produces the most coffee in the world?', 'Brazil', 'General', 3),
('P', 'What is the most populous country in the world?', 'China', 'Geography', 1),
('H', 'How many sides does a hexagon have?', 'Six', 'Math', 1),
('NL', 'What is the longest river in the world?', 'Nile', 'Geography', 2),
('C', 'What is the primary gas found in the Earths atmosphere?', 'Nitrogen', 'Science', 3),
('M', 'What is the capital of Spain?', 'Madrid', 'Geography', 2),
('V', 'What is the only planet that rotates clockwise?', 'Venus', 'Science', 4),
('T', 'What is the square root of 144?', 'Twelve', 'Math', 2),
('S', 'Which country hosted the first Modern Olympic Games?', 'Greece', 'Sports', 3),
('A', 'What is the capital of the Netherlands?', 'Amsterdam', 'Geography', 2),
('S', 'What is the chemical symbol for Silver?', 'Ag', 'Science', 3),
('S', 'What is the capital of South Korea?', 'Seoul', 'Geography', 2),
('A', 'Which desert is the largest hot desert in the world?', 'Sahara', 'Geography', 2),
('B', 'What is the capital of Thailand?', 'Bangkok', 'Geography', 2),
('D', 'What is the name of the fairy in Peter Pan?', 'Tinker Bell', 'Literature', 2),
('L', 'What is the capital of the United Kingdom?', 'London', 'Geography', 1),
('A', 'Which state is known as the Sunshine State?', 'Florida', 'Geography', 2),
('M', 'Who was the first President of the United States?', 'George Washington', 'History', 1),
('S', 'What is the hardest natural substance on Earth?', 'Diamond', 'Science', 2),
('C', 'What is the capital of Canada?', 'Ottawa', 'Geography', 3),
('J', 'Which planet is the largest in our solar system?', 'Jupiter', 'Science', 1),
('A', 'What is the capital of Australia?', 'Canberra', 'Geography', 3),
('P', 'Who is the author of the Harry Potter series?', 'J.K. Rowling', 'Literature', 1),
('H', 'How many hearts does an octopus have?', 'Three', 'Nature', 3),
('L', 'What is the capital of Portugal?', 'Lisbon', 'Geography', 3),
('G', 'What is the name of the galaxy we live in?', 'Milky Way', 'Science', 2),
('S', 'Which language has the most native speakers?', 'Mandarin', 'General', 3),
('D', 'Who discovered Penicillin?', 'Alexander Fleming', 'Science', 4),
('C', 'What is the capital of Egypt?', 'Cairo', 'Geography', 2),
('T', 'What is the tallest building in the world?', 'Burj Khalifa', 'General', 3),
('W', 'Who is the Greek god of the sea?', 'Poseidon', 'Mythology', 3),
('V', 'What is the capital of Austria?', 'Vienna', 'Geography', 3),
('L', 'What is the Roman numeral for 50?', 'L', 'Math', 3),
('S', 'What is the capital of Sweden?', 'Stockholm', 'Geography', 3),
('M', 'What is the capital of Russia?', 'Moscow', 'Geography', 2),
('B', 'What is the capital of Belgium?', 'Brussels', 'Geography', 3),
('P', 'What is the capital of France?', 'Paris', 'Geography', 1),
('W', 'Which bird is a universal symbol of peace?', 'Dove', 'General', 1),
('H', 'What is the capital of Finland?', 'Helsinki', 'Geography', 3),
('L', 'What is the capital of Peru?', 'Lima', 'Geography', 3),
('N', 'What is the capital of Norway?', 'Oslo', 'Geography', 3),
('A', 'What is the capital of Greece?', 'Athens', 'Geography', 2),
('S', 'What is the capital of Switzerland?', 'Bern', 'Geography', 4),
('B', 'What is the capital of Argentina?', 'Buenos Aires', 'Geography', 3),
('D', 'What is the capital of Ireland?', 'Dublin', 'Geography', 2),
('W', 'What is the capital of Poland?', 'Warsaw', 'Geography', 3),
('M', 'What is the capital of Mexico?', 'Mexico City', 'Geography', 1),
('L', 'What is the capital of Luxembourg?', 'Luxembourg', 'Geography', 4),
('B', 'What is the capital of Romania?', 'Bucharest', 'Geography', 4),
('P', 'What is the capital of the Czech Republic?', 'Prague', 'Geography', 3),
('C', 'What is the capital of Denmark?', 'Copenhagen', 'Geography', 3),
('A', 'What is the capital of Turkey?', 'Ankara', 'Geography', 4),
('S', 'What is the capital of Chile?', 'Santiago', 'Geography', 3),
('B', 'What is the capital of Colombia?', 'Bogota', 'Geography', 4),
('Q', 'What is the capital of Ecuador?', 'Quito', 'Geography', 4),
('C', 'What is the capital of Venezuela?', 'Caracas', 'Geography', 4),
('L', 'What is the capital of Bolivia?', 'La Paz', 'Geography', 5),
('A', 'What is the capital of Paraguay?', 'Asuncion', 'Geography', 5),
('M', 'What is the capital of Uruguay?', 'Montevideo', 'Geography', 5),
('G', 'What is the capital of Guyana?', 'Georgetown', 'Geography', 5),
('P', 'What is the capital of Suriname?', 'Paramaribo', 'Geography', 5),
('B', 'What is the capital of Iraq?', 'Baghdad', 'Geography', 3),
('T', 'What is the capital of Iran?', 'Tehran', 'Geography', 3),
('A', 'What is the capital of Afghanistan?', 'Kabul', 'Geography', 4),
('I', 'What is the capital of Pakistan?', 'Islamabad', 'Geography', 4),
('D', 'What is the capital of India?', 'New Delhi', 'Geography', 2),
('B', 'What is the capital of China?', 'Beijing', 'Geography', 2),
('T', 'What is the capital of Japan?', 'Tokyo', 'Geography', 1),
('M', 'What is the capital of the Philippines?', 'Manila', 'Geography', 3),
('J', 'What is the capital of Indonesia?', 'Jakarta', 'Geography', 3),
('K', 'What is the capital of Malaysia?', 'Kuala Lumpur', 'Geography', 3),
('S', 'What is the capital of Singapore?', 'Singapore', 'Geography', 2),
('H', 'What is the capital of Vietnam?', 'Hanoi', 'Geography', 3),
('V', 'What is the capital of Laos?', 'Vientiane', 'Geography', 5),
('P', 'What is the capital of Cambodia?', 'Phnom Penh', 'Geography', 4),
('C', 'Who wrote "The Origin of Species"?', 'Charles Darwin', 'Science', 4),
('A', 'What is the most common element in the universe?', 'Hydrogen', 'Science', 3),
('G', 'What is the study of rocks called?', 'Geology', 'Science', 2),
('B', 'What is the largest animal on Earth?', 'Blue Whale', 'Nature', 1)
ON CONFLICT (question_text) DO NOTHING;

INSERT INTO yes_no_questions (question_text, correct_answer, category) VALUES
('Is the sun a star?', true, 'Science'),
('Is the Great Wall of China visible from the moon with the naked eye?', false, 'General'),
('Does water boil at 100 degrees Celsius?', true, 'Science'),
('Is shark a mammal?', false, 'Nature'),
('Is the capital of the USA New York City?', false, 'Geography'),
('Is Mount Kilimanjaro the tallest mountain in the world?', false, 'Geography'),
('Do penguins live in the Arctic?', false, 'Nature'),
('Is the hummingbird the smallest bird?', true, 'Nature'),
('Is gold a liquid at room temperature?', false, 'Science'),
('Is the human body composed of about 60% water?', true, 'Science'),
('Is an octagon a shape with eight sides?', true, 'Math'),
('Is light faster than sound?', true, 'Science'),
('Is the Amazon River the longest river in the world?', false, 'Geography'),
('Is the earth flat?', false, 'Science'),
('Is the moon a planet?', false, 'Science'),
('Is the Atlantic Ocean the largest ocean?', false, 'Geography'),
('Is a tomato a fruit?', true, 'Nature'),
('Is iron a metal?', true, 'Science'),
('Is the Sahara Desert located in Asia?', false, 'Geography'),
('Is French the official language of Brazil?', false, 'General'),
('Is the Venus Flytrap a carnivorous plant?', true, 'Nature'),
('Is Mars closer to the sun than Earth?', false, 'Science'),
('Is the capital of Australia Sydney?', false, 'Geography'),
('Is a spider an insect?', false, 'Nature'),
('Is the Great Barrier Reef located in Australia?', true, 'Geography'),
('Is an island surrounded by water?', true, 'Geography'),
('Is the Pacific Ocean the smallest ocean?', false, 'Geography'),
('Is the cheetah the fastest land animal?', true, 'Nature'),
('Is the eiffel tower in London?', false, 'Geography'),
('Is the pine tree an evergreen?', true, 'Nature'),
('Is the currency of the UK the Euro?', false, 'Finance'),
('Is Tokyo the capital of Japan?', true, 'Geography'),
('Is a leap year 366 days long?', true, 'General'),
('Is the blue whale a fish?', false, 'Nature'),
('Is honey made by bees?', true, 'Nature'),
('Is the human heart a muscle?', true, 'Science'),
('Is the capital of Canada Toronto?', false, 'Geography'),
('Is the Nile River in Africa?', true, 'Geography'),
('Is Pluto considered a planet today?', false, 'Science'),
('Is diamond made of carbon?', true, 'Science'),
('Is the Statue of Liberty in Washington D.C.?', false, 'Geography'),
('Is a square a type of rectangle?', true, 'Math'),
('Is 11 a prime number?', true, 'Math'),
('Is the ostrich the largest bird?', true, 'Nature'),
('Is the North Pole on a continent?', false, 'Geography'),
('Is the Pacific Ocean located between Asia and America?', true, 'Geography'),
('Is a marathon 26.2 miles long?', true, 'Sports'),
('Is the electric light bulb invented by Thomas Edison?', true, 'History'),
('Is the capital of Russia Saint Petersburg?', false, 'Geography'),
('Is the human skeleton made of bones?', true, 'Science')
ON CONFLICT (question_text) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_leaderboard_rank
ON users (elo_rating DESC, username ASC);

CREATE INDEX IF NOT EXISTS idx_matches_finished_winner_id
ON matches (winner_id)
WHERE status IN ('completed', 'aborted');

CREATE INDEX IF NOT EXISTS idx_matches_finished_player1_id
ON matches (player1_id)
WHERE status IN ('completed', 'aborted');

CREATE INDEX IF NOT EXISTS idx_matches_finished_player2_id
ON matches (player2_id)
WHERE status IN ('completed', 'aborted');