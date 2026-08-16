import React from "react";
import styled from "styled-components";
import Icon from "./icon";
import { borderTheme__css } from "../styles/CssComponents";

interface SearchBarProps {
  stateValue: { [key: string]: string };
  stateChangeValue: React.Dispatch<
    React.SetStateAction<{ [key: string]: string }>
  >;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  searchValue: string;
  setSearchValue: React.Dispatch<React.SetStateAction<string>>;
  filterKey?: string;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  stateValue,
  stateChangeValue,
  setCurrentPage,
  searchValue,
  setSearchValue,
  filterKey = "numpoliza",
  placeholder = "Buscar póliza...",
}) => {
  const handleSearch = () => {
    setCurrentPage(1);

    if (!searchValue.trim()) {
      const newState = { ...stateValue };
      delete newState[filterKey];
      stateChangeValue(newState);
      return;
    }

    stateChangeValue({
      ...stateValue,
      [filterKey]: searchValue.trim(),
    });
  };

  return (
    <SearchBarContainer>
      <SearchInput
        value={searchValue}
        placeholder={placeholder}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch();
          }
        }}
      />

      <SearchButton onClick={handleSearch}>
        <Icon iconName="Search" size={20} customColor="#000" />
      </SearchButton>
    </SearchBarContainer>
  );
};

const SearchBarContainer = styled.div`
  width: 100%;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 15px;
  border: 1px solid #0000003e;
  /* ${borderTheme__css} */
`;

const SearchInput = styled.input`
  background-color: transparent;
  border: none;
  outline: none;
  width: 100%;
  font-size: 1rem;
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  border-radius: 8px;
  height: 40px;
  background-color: transparent;
  border: none;
  transition: 0.2s linear;
  opacity: 0.6;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`;

export default SearchBar;
