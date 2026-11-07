CXX := g++
CXXFLAGS := -std=c++17 -Wall -Wextra -Iinclude
SRC_DIR := src
BIN_DIR := bin
TARGET := $(BIN_DIR)/physics_engine
TEST_TARGET := $(BIN_DIR)/run_tests

SOURCES := $(wildcard $(SRC_DIR)/*.cpp)
OBJECTS := $(SOURCES:.cpp=.o)

all: $(TARGET)

$(TARGET): $(OBJECTS) | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $(OBJECTS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

# Builds and runs the unit tests (everything except the console main()).
test: | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $(TEST_TARGET) tests/test_main.cpp $(filter-out $(SRC_DIR)/main.cpp,$(SOURCES))
	./$(TEST_TARGET)

web:
	./build_web.sh

clean:
	rm -f $(SRC_DIR)/*.o $(TARGET) $(TEST_TARGET)
	rm -f web/physics_engine.js web/physics_engine.wasm web/physics_engine.data

run: all
	./$(TARGET)

serve-web:
	cd web && python3 -m http.server 8080

.PHONY: all test web clean run serve-web
