// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
        bool exists;
    }

    address public owner;
    bool public electionStarted;
    bool public electionEnded;

    mapping(uint256 => Candidate) public candidates;
    uint256[] public candidateIds;

    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed id, string name, string party);
    event ElectionStarted();
    event ElectionEnded();
    event Voted(address indexed voter, uint256 indexed candidateId);

    modifier onlyOwner() {
        require(msg.sender == owner, 'Only owner can perform this action');
        _;
    }

    modifier electionActive() {
        require(electionStarted, 'Election has not started');
        require(!electionEnded, 'Election has ended');
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addCandidate(uint256 _id, string memory _name, string memory _party) external onlyOwner {
        require(!electionStarted, 'Cannot add candidates after election starts');
        require(!candidates[_id].exists, 'Candidate already exists');

        candidates[_id] = Candidate({
            id: _id,
            name: _name,
            party: _party,
            voteCount: 0,
            exists: true
        });

        candidateIds.push(_id);
        emit CandidateAdded(_id, _name, _party);
    }

    function startElection() external onlyOwner {
        require(!electionStarted, 'Election already started');
        require(candidateIds.length > 0, 'No candidates added');

        electionStarted = true;
        electionEnded = false;

        emit ElectionStarted();
    }

    function endElection() external onlyOwner {
        require(electionStarted, 'Election not started yet');
        require(!electionEnded, 'Election already ended');

        electionEnded = true;
        emit ElectionEnded();
    }

    function vote(uint256 _candidateId) external electionActive {
        require(!hasVoted[msg.sender], 'You have already voted');
        require(candidates[_candidateId].exists, 'Invalid candidate');

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount += 1;

        emit Voted(msg.sender, _candidateId);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory result = new Candidate[](candidateIds.length);

        for (uint256 i = 0; i < candidateIds.length; i++) {
            result[i] = candidates[candidateIds[i]];
        }

        return result;
    }

    function getElectionState() external view returns (bool started, bool ended) {
        return (electionStarted, electionEnded);
    }
}
